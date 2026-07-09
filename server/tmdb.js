import { filmKey } from '../src/lib/filmKey.js'

// ---------------------------------------------------------------------------
// Enrichissement TMDB (https://developer.themoviedb.org) — côté serveur pour
// garder la clé secrète (env TMDB_API_KEY, v3 "API Key" ou v4 "Read Access
// Token"). Sans clé, enrichFilms() renvoie { available: false } et l'app
// dégrade proprement (pas d'affiches ni de stats genres/réalisateurs).
//
// TMDB n'est PAS derrière le blocage Cloudflare de Letterboxd : fetch natif OK.
//
// 1 film = 1 appel /search/movie (poster, genres, date, popularité) ;
// + 1 appel /credits si `wantCredits` (réalisateurs). Le cache mémoire évite
// de repayer ces appels pour les films déjà vus par l'instance.
// ---------------------------------------------------------------------------

const API = 'https://api.themoviedb.org/3'
const CONCURRENCY = 8 // TMDB tolère ~50 req/s ; 8 en parallèle reste poli
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 h (l'instance vit rarement si vieux)

// Ids de genres TMDB (stables) -> libellés français.
export const GENRES = {
  28: 'Action',
  12: 'Aventure',
  16: 'Animation',
  35: 'Comédie',
  80: 'Policier',
  99: 'Documentaire',
  18: 'Drame',
  10751: 'Familial',
  14: 'Fantastique',
  36: 'Histoire',
  27: 'Horreur',
  10402: 'Musique',
  9648: 'Mystère',
  10749: 'Romance',
  878: 'Science-fiction',
  10770: 'Téléfilm',
  53: 'Thriller',
  10752: 'Guerre',
  37: 'Western',
}

const cache = new Map() // filmKey -> { ts, data } (data.directors présent si credits déjà chargés)

function auth() {
  const key = (process.env.TMDB_API_KEY || '').trim()
  if (!key) return null
  // v4 Read Access Token = JWT ("ey…") -> header Bearer ; v3 = query param.
  return key.startsWith('ey')
    ? { headers: { Authorization: `Bearer ${key}` }, param: '' }
    : { headers: {}, param: `&api_key=${key}` }
}

export function tmdbAvailable() {
  return auth() != null
}

async function tmdbGet(path, query) {
  const a = auth()
  const res = await fetch(`${API}${path}?${query}${a.param}`, {
    headers: a.headers,
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`TMDB ${res.status} sur ${path}`)
  return res.json()
}

// Meilleur candidat : année identique, puis ±1 an (les millésimes Letterboxd
// et TMDB divergent parfois d'un an autour des sorties festival), sinon 1er.
function bestMatch(results, year) {
  if (!results?.length) return null
  if (year == null) return results[0]
  const yearOf = (r) => (r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : null)
  return (
    results.find((r) => yearOf(r) === year) ||
    results.find((r) => Math.abs((yearOf(r) ?? 0) - year) <= 1) ||
    results[0]
  )
}

async function searchFilm(name, year) {
  const q = `query=${encodeURIComponent(name)}&include_adult=false`
  let data = await tmdbGet('/search/movie', year ? `${q}&primary_release_year=${year}` : q)
  let match = bestMatch(data.results, year)
  if (!match && year) {
    // Millésime différent chez TMDB : on retente sans filtre d'année.
    data = await tmdbGet('/search/movie', q)
    match = bestMatch(data.results, year)
  }
  if (!match) return null
  return {
    tmdbId: match.id,
    posterPath: match.poster_path || null,
    genreIds: match.genre_ids || [],
    releaseDate: match.release_date || null,
    popularity: match.popularity ?? null,
    voteAverage: match.vote_average ?? null,
  }
}

async function fetchDirectors(tmdbId) {
  const data = await tmdbGet(`/movie/${tmdbId}/credits`, 'language=fr-FR')
  return (data.crew || []).filter((c) => c.job === 'Director').map((c) => c.name)
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Enrichit une liste de films { name, year, wantCredits? } via TMDB.
 * Renvoie { available, films: [{ name, year, tmdbId, posterPath, genreIds,
 * releaseDate, directors? }] } — un film introuvable donne tmdbId: null.
 */
export async function enrichFilms(films) {
  if (!tmdbAvailable()) return { available: false, films: [] }

  const out = await mapLimit(films, CONCURRENCY, async (f) => {
    const key = filmKey(f.name, f.year)
    const hit = cache.get(key)
    let data = hit && Date.now() - hit.ts < CACHE_TTL ? hit.data : undefined

    try {
      if (data === undefined) {
        data = await searchFilm(f.name, f.year)
        cache.set(key, { ts: Date.now(), data })
      }
      if (data && f.wantCredits && data.directors === undefined) {
        data.directors = await fetchDirectors(data.tmdbId)
      }
    } catch {
      // Échec TMDB ponctuel : film non enrichi, on ne casse pas le lot.
      if (data === undefined) data = null
    }

    return data
      ? { name: f.name, year: f.year ?? null, ...data }
      : { name: f.name, year: f.year ?? null, tmdbId: null }
  })

  // Borne la taille du cache (instance serverless de longue durée).
  if (cache.size > 20_000) cache.clear()

  return { available: true, films: out }
}
