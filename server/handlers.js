import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { scrapeProfile } from './scrapeLetterboxd.js'
import { searchMembers } from './searchMembers.js'
import { enrichFilms } from './tmdb.js'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Handlers HTTP agnostiques du framework : chaque fonction renvoie
// { status, body } (ou { status, headers, buffer } pour les binaires) et est
// branchée telle quelle sur Express (dev local) ET sur les fonctions
// serverless Vercel (api/*.js). Toute la validation / rate-limiting vit ici.
//
// ⚠️ Limite connue et assumée : le cache et les compteurs de rate-limit sont
// en MÉMOIRE D'INSTANCE. Sur Vercel, plusieurs instances simultanées ont
// chacune leur Map (cache moins efficace, limite par instance et non globale).
// À notre niveau de trafic c'est un compromis volontaire — pas de store
// externe payant pour ça. À revoir si le trafic décolle (cf. README).
// ---------------------------------------------------------------------------

const profileCache = new Map() // username -> { ts, data }
const PROFILE_TTL = 1000 * 60 * 30 // 30 min

// Rate-limiter à fenêtre glissante, par IP.
function makeLimiter({ max, windowMs }) {
  const hits = new Map() // ip -> [timestamps]
  return (ip) => {
    const now = Date.now()
    const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs)
    if (arr.length >= max) return false
    arr.push(now)
    hits.set(ip, arr)
    if (hits.size > 5000) hits.clear() // borne mémoire
    return true
  }
}

const limitProfile = makeLimiter({ max: 10, windowMs: 10 * 60 * 1000 }) // 10 scrapes / 10 min
const limitSearch = makeLimiter({ max: 40, windowMs: 60 * 1000 })
const limitEnrich = makeLimiter({ max: 20, windowMs: 10 * 60 * 1000 })
const limitImg = makeLimiter({ max: 240, windowMs: 60 * 1000 })

const rateLimited = {
  status: 429,
  body: {
    error: 'Trop de requêtes d’affilée. Patiente une minute puis réessaie.',
    code: 'RATE_LIMIT_CLIENT',
  },
}

function errorStatus(code) {
  switch (code) {
    case 'NOT_FOUND':
    case 'EMPTY':
      return 404
    case 'BAD_USERNAME':
      return 400
    case 'TOO_LARGE':
      return 413
    case 'RATE_LIMITED':
      return 429
    case 'CURL_MISSING':
      return 501
    default:
      return 502
  }
}

/** GET /api/profile/:username — scrape (ou cache) d'un profil public. */
export async function profileHandler(username, ip) {
  const key = String(username || '')
    .trim()
    .toLowerCase()
  if (!key || key.length > 60) {
    return { status: 400, body: { error: 'Pseudo Letterboxd invalide.', code: 'BAD_USERNAME' } }
  }

  const hit = profileCache.get(key)
  if (hit && Date.now() - hit.ts < PROFILE_TTL) {
    return { status: 200, body: { ...hit.data, cached: true } }
  }

  if (!limitProfile(ip)) return rateLimited

  try {
    const data = await scrapeProfile(key)
    profileCache.set(key, { ts: Date.now(), data })
    if (profileCache.size > 500) profileCache.clear()
    return { status: 200, body: data }
  } catch (err) {
    return {
      status: errorStatus(err.code),
      body: { error: err.message, code: err.code || 'SCRAPE_ERROR' },
    }
  }
}

/** GET /api/search/:query — autocomplétion de membres Letterboxd. */
export async function searchHandler(query, ip) {
  if (!limitSearch(ip)) return { status: 200, body: { results: [] } } // silencieux : simple autocomplete
  try {
    return { status: 200, body: { results: await searchMembers(String(query || '')) } }
  } catch {
    return { status: 200, body: { results: [] } }
  }
}

const MAX_ENRICH = 250
const MAX_CREDITS = 120

/** POST /api/enrich — lot de films à enrichir via TMDB. */
export async function enrichHandler(payload, ip) {
  if (!limitEnrich(ip)) return rateLimited

  const raw = Array.isArray(payload?.films) ? payload.films : []
  let credits = 0
  const films = raw.slice(0, MAX_ENRICH).flatMap((f) => {
    const name = typeof f?.name === 'string' ? f.name.trim().slice(0, 300) : ''
    if (!name) return []
    const year = Number.isInteger(f.year) && f.year > 1870 && f.year < 2100 ? f.year : null
    const wantCredits = f.wantCredits === true && credits < MAX_CREDITS && !!++credits
    return [{ name, year, wantCredits }]
  })

  if (!films.length) return { status: 200, body: { available: true, films: [] } }
  return { status: 200, body: await enrichFilms(films) }
}

// Proxy d'images : le canvas de la carte partageable ne peut dessiner que des
// images CORS ; les CDNs de posters n'envoient pas les bons en-têtes. On ne
// relaie QUE ces hôtes (pas de proxy ouvert), en https, avec un cache CDN long.
const IMG_HOSTS = new Set([
  'a.ltrbxd.com',
  's.ltrbxd.com',
  'image.tmdb.org',
  'secure.gravatar.com', // avatars Letterboxd par défaut
])

/** GET /api/img?u=<url encodée> — image proxifiée avec CORS. */
export async function imgHandler(rawUrl, ip) {
  if (!limitImg(ip)) return { status: 429 }

  let url
  try {
    url = new URL(String(rawUrl || ''))
  } catch {
    return { status: 400 }
  }
  if (url.protocol !== 'https:' || !IMG_HOSTS.has(url.hostname)) return { status: 403 }

  try {
    // curl comme pour le scraping : les CDN ltrbxd partagent le WAF Cloudflare.
    const { stdout } = await execFileAsync(
      'curl',
      ['-sS', '--fail', '--max-time', '15', '-A', 'Mozilla/5.0', url.href],
      { maxBuffer: 10 * 1024 * 1024, encoding: 'buffer' },
    )
    const type = url.pathname.endsWith('.png') ? 'image/png' : 'image/jpeg'
    return {
      status: 200,
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=604800, immutable',
        'access-control-allow-origin': '*',
      },
      buffer: stdout,
    }
  } catch {
    return { status: 502 }
  }
}

/** IP client, derrière le proxy Vercel ou en direct (Express local). */
export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}
