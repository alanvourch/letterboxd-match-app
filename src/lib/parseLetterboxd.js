import Papa from 'papaparse'
import JSZip from 'jszip'
import { filmKey, parseYear } from './filmKey.js'

// ---------------------------------------------------------------------------
// Parsing d'un export Letterboxd.
//
// L'export officiel est un .zip contenant notamment :
//   - ratings.csv      -> Date, Name, Year, Letterboxd URI, Rating
//   - watched.csv      -> Date, Name, Year, Letterboxd URI
//   - diary.csv        -> ... Rating, Rewatch, Tags, Watched Date
//   - likes/films.csv  -> Date, Name, Year, Letterboxd URI
//   - profile.csv      -> ... Favorite Films  (liste d'URLs de films, "quotée")
//
// ⚠️ Piège confirmé sur de vraies données : la colonne "Letterboxd URI" pointe
// vers le FILM dans watched/ratings/likes/favoris, mais vers l'ENTRÉE DE
// JOURNAL dans diary.csv (URI différente pour le même film). On ne peut donc
// pas utiliser l'URI comme identité de film.
//
// => Clé canonique d'un film = Nom + Année (stable dans tous les fichiers).
//    On garde en parallèle un index URI -> film, alimenté uniquement par les
//    fichiers qui exposent l'URI du film, pour relier les favoris.
// ---------------------------------------------------------------------------

function parseCsv(text) {
  if (!text) return []
  const { data } = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  return data
}

// Récupère une valeur de colonne de manière tolérante (casse / espaces).
function pick(row, ...names) {
  const keys = Object.keys(row)
  for (const name of names) {
    const found = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase())
    if (found && row[found] != null && row[found] !== '') return row[found]
  }
  return undefined
}

function parseRating(raw) {
  if (raw == null || raw === '') return null
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

// Crée / récupère l'entrée d'un film. `isFilmUri` = true quand l'URI fournie
// désigne bien le film (watched/ratings/likes/favoris), false pour le diary.
function ensureFilm(store, name, year, uri, isFilmUri) {
  if (!name) return null
  const key = filmKey(name, year)
  let film = store.films.get(key)
  if (!film) {
    film = {
      uri: null,
      name: name.trim(),
      year: parseYear(year),
      rating: null,
      watched: false,
      liked: false,
      isFavorite: false,
    }
    store.films.set(key, film)
  }
  if (uri && isFilmUri) {
    if (!film.uri) film.uri = uri
    store.uriIndex.set(uri, film)
  }
  return film
}

function ingestWatched(store, rows) {
  for (const row of rows) {
    const film = ensureFilm(
      store,
      pick(row, 'Name'),
      pick(row, 'Year'),
      pick(row, 'Letterboxd URI'),
      true,
    )
    if (film) film.watched = true
  }
}

function ingestRatings(store, rows) {
  for (const row of rows) {
    const film = ensureFilm(
      store,
      pick(row, 'Name'),
      pick(row, 'Year'),
      pick(row, 'Letterboxd URI'),
      true,
    )
    if (!film) continue
    film.watched = true
    const rating = parseRating(pick(row, 'Rating'))
    if (rating != null) film.rating = rating
  }
}

function ingestLikes(store, rows) {
  for (const row of rows) {
    const film = ensureFilm(
      store,
      pick(row, 'Name'),
      pick(row, 'Year'),
      pick(row, 'Letterboxd URI'),
      true,
    )
    if (film) film.liked = true
  }
}

// diary.csv : son URI désigne l'entrée de journal, pas le film -> isFilmUri=false.
// Il complète surtout l'ensemble "vu" ; la note de ratings.csv reste prioritaire.
function ingestDiary(store, rows) {
  for (const row of rows) {
    const film = ensureFilm(
      store,
      pick(row, 'Name'),
      pick(row, 'Year'),
      pick(row, 'Letterboxd URI'),
      false,
    )
    if (!film) continue
    film.watched = true
    if (film.rating == null) {
      const rating = parseRating(pick(row, 'Rating'))
      if (rating != null) film.rating = rating
    }
  }
}

// Les favoris vivent dans profile.csv (colonne "Favorite Films"), sous forme
// d'URLs de films séparées par des virgules. On les relie aux films connus via
// l'index URI ; sinon on retombe sur un lien brut.
function parseFavorites(store, profileRows) {
  if (!profileRows.length) return []
  const raw = pick(profileRows[0], 'Favorite Films', 'Favorites')
  if (!raw) return []

  const parts = raw
    .split(/[,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)

  return parts.map((part) => {
    if (/^https?:\/\//i.test(part)) {
      // 1) match direct sur l'URI exacte du film
      let film = store.uriIndex.get(part)
      // 2) fallback : match sur le slug de fin (robustesse domaine)
      if (!film) {
        const slug = urlSlug(part)
        if (slug) {
          for (const [u, f] of store.uriIndex) {
            if (urlSlug(u) === slug) {
              film = f
              break
            }
          }
        }
      }
      if (film) {
        film.isFavorite = true
        return { uri: film.uri, name: film.name, year: film.year }
      }
      // Film favori non vu / absent des autres CSV : lien brut, titre illisible.
      return { uri: part, name: prettifyUrl(part), year: null }
    }
    // Cas titre brut : on essaie de matcher par nom.
    const match = [...store.films.values()].find(
      (f) => f.name.toLowerCase() === part.toLowerCase(),
    )
    if (match) {
      match.isFavorite = true
      return { uri: match.uri, name: match.name, year: match.year }
    }
    return { uri: null, name: part, year: null }
  })
}

// Dernier segment significatif d'une URL (code court boxd.it / slug de film).
function urlSlug(url) {
  if (!url) return null
  const m = url.match(/([^/]+)\/?$/)
  return m ? m[1].toLowerCase() : null
}

function prettifyUrl(url) {
  const m = url.match(/\/film\/([^/]+)/)
  if (!m) return url
  return m[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildProfile(username, csvByName) {
  const store = { films: new Map(), uriIndex: new Map() }

  // Ordre important : les fichiers porteurs de l'URI du film d'abord, diary en
  // dernier (il ne doit jamais écraser l'URI du film).
  ingestWatched(store, csvByName.watched || [])
  ingestRatings(store, csvByName.ratings || [])
  ingestLikes(store, csvByName.likes || [])
  ingestDiary(store, csvByName.diary || [])

  const favorites = parseFavorites(store, csvByName.profile || [])

  let resolvedName = username
  if (!resolvedName && csvByName.profile?.length) {
    resolvedName = pick(csvByName.profile[0], 'Username', 'Given Name')
  }

  return {
    username: resolvedName || 'Utilisateur',
    films: store.films,
    favorites,
  }
}

// Trouve une entrée dans le zip par nom de fichier, peu importe le dossier/casse.
function findEntry(zip, ...candidates) {
  const entries = Object.keys(zip.files)
  for (const cand of candidates) {
    const found = entries.find(
      (e) => e.toLowerCase().replace(/^\/+/, '') === cand.toLowerCase(),
    )
    if (found) return zip.files[found]
    const base = entries.find((e) => e.toLowerCase().endsWith('/' + cand.toLowerCase()))
    if (base) return zip.files[base]
  }
  return null
}

async function readEntry(entry) {
  if (!entry) return ''
  return entry.async('string')
}

/**
 * Parse un export Letterboxd au format .zip.
 * @param {File|Blob|ArrayBuffer} input
 * @param {string} [username]
 * @returns {Promise<Profile>}
 */
export async function parseZip(input, username) {
  const zip = await JSZip.loadAsync(input)

  const [ratings, watched, diary, likes, profile] = await Promise.all([
    readEntry(findEntry(zip, 'ratings.csv')),
    readEntry(findEntry(zip, 'watched.csv')),
    readEntry(findEntry(zip, 'diary.csv')),
    readEntry(findEntry(zip, 'likes/films.csv', 'films.csv')),
    readEntry(findEntry(zip, 'profile.csv')),
  ])

  const csvByName = {
    ratings: parseCsv(ratings),
    watched: parseCsv(watched),
    diary: parseCsv(diary),
    likes: parseCsv(likes),
    profile: parseCsv(profile),
  }

  if (
    !csvByName.ratings.length &&
    !csvByName.watched.length &&
    !csvByName.diary.length
  ) {
    throw new Error(
      "Ce .zip ne ressemble pas à un export Letterboxd (aucun ratings.csv / watched.csv trouvé).",
    )
  }

  return buildProfile(username, csvByName)
}

/**
 * Parse des fichiers CSV individuels (fallback si l'utilisateur n'a pas le zip).
 * On devine le rôle de chaque fichier d'après son nom puis ses colonnes.
 * @param {File[]} fileList
 * @param {string} [username]
 */
export async function parseLooseCsvs(fileList, username) {
  const csvByName = { ratings: [], watched: [], diary: [], likes: [], profile: [] }

  for (const file of fileList) {
    const text = await file.text()
    const rows = parseCsv(text)
    if (!rows.length) continue
    const name = file.name.toLowerCase()
    const cols = Object.keys(rows[0]).map((c) => c.toLowerCase())

    if (name.includes('profile') || cols.includes('favorite films')) {
      csvByName.profile = rows
    } else if (name.includes('diary')) {
      csvByName.diary = rows
    } else if (name.includes('like')) {
      csvByName.likes = rows
    } else if (name.includes('rating') || cols.includes('rating')) {
      csvByName.ratings = rows
    } else if (name.includes('watched') || cols.includes('letterboxd uri')) {
      csvByName.watched = rows
    }
  }

  if (
    !csvByName.ratings.length &&
    !csvByName.watched.length &&
    !csvByName.diary.length
  ) {
    throw new Error(
      'Aucun CSV exploitable trouvé (ratings.csv, watched.csv ou diary.csv attendus).',
    )
  }

  return buildProfile(username, csvByName)
}
