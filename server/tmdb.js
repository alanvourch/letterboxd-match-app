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

// NB : le mapping id de genre -> libellé vit côté client (src/lib/tmdbGenres.js),
// l'API ne renvoie que les genre_ids bruts.

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

// Meilleur candidat : parmi les résultats à ±1 an du millésime Letterboxd
// (les années Letterboxd/TMDB divergent parfois d'un an — sorties festival),
// le plus populaire gagne, avec un bonus si l'année est exacte. La popularité
// départage les homonymes obscurs ("Crash" 2004 inconnu vs le Haggis daté 2005).
function bestMatch(results, year) {
  if (!results?.length) return null
  if (year == null) return results[0]
  const yearOf = (r) => (r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : null)
  const near = results.filter((r) => Math.abs((yearOf(r) ?? Infinity) - year) <= 1)
  if (!near.length) return results[0]
  const score = (r) => ((r.popularity ?? 0) + 0.01) * (yearOf(r) === year ? 2 : 1)
  return near.reduce((best, r) => (score(r) > score(best) ? r : best))
}

async function searchFilm(name, year) {
  // PAS de filtre primary_release_year : il exclut le bon film quand les
  // millésimes Letterboxd/TMDB diffèrent d'un an (sorties festival) et fait
  // remonter des homonymes obscurs ("300" -> un inconnu de 2006 au lieu du
  // Snyder daté 2007 chez TMDB). On cherche large et on départage par année.
  const q = `query=${encodeURIComponent(name)}&include_adult=false`
  const data = await tmdbGet('/search/movie', q)
  const match = bestMatch(data.results, year)
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
