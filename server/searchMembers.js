import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// L'API publique v0 de Letterboxd répond à la recherche de membres SANS auth.
// (Le reste de l'API demande une clé ; ici on ne s'en sert que pour l'autocomplete.)
const API = 'https://api.letterboxd.com/api/v0/search'

// Même contrainte que le scraper : Cloudflare est devant api.letterboxd.com et
// peut bloquer les IPs datacenter (Vercel) sans en-têtes crédibles. curl (et
// non fetch) pour l'empreinte TLS, + UA navigateur. cf. scrapeLetterboxd.js.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function curlJson(url) {
  const { stdout } = await execFileAsync(
    'curl',
    [
      '-sS',
      '--compressed',
      '--connect-timeout',
      '5',
      '--max-time',
      '10',
      '-A',
      UA,
      '-H',
      'Accept: application/json',
      '-H',
      'Accept-Language: en-US,en;q=0.9',
      url,
    ],
    { maxBuffer: 8 * 1024 * 1024 },
  )
  return JSON.parse(stdout) // un 403 Cloudflare (HTML) jette ici -> retry/log
}

// Choisit une vignette d'avatar proche de ~140px.
function pickAvatar(member) {
  const sizes = member?.avatar?.sizes
  if (!Array.isArray(sizes) || !sizes.length) return null
  const sorted = [...sizes].sort((a, b) => a.width - b.width)
  return (sorted.find((s) => s.width >= 100) || sorted[sorted.length - 1]).url
}

/**
 * Recherche de membres Letterboxd pour l'autocomplétion.
 * @param {string} query
 * @returns {Promise<Array<{username, displayName, avatarUrl}>>}
 */
export async function searchMembers(query) {
  const q = (query || '').trim()
  if (q.length < 2) return []

  const url = `${API}?input=${encodeURIComponent(q)}&include=MemberSearchItem&perPage=8`
  let data
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      data = await curlJson(url)
      break
    } catch (e) {
      if (attempt === 1) {
        // L'autocomplete reste silencieuse côté UI, mais la cause doit être
        // visible dans les logs serveur (Vercel) pour diagnostiquer.
        console.error(`[search] échec Letterboxd pour « ${q} » :`, e.message)
        return []
      }
      await sleep(400)
    }
  }

  return (data.items || [])
    .map((it) => it.member)
    .filter(Boolean)
    .map((m) => ({
      username: m.username,
      displayName: m.displayName || m.username,
      avatarUrl: pickAvatar(m),
    }))
    .filter((m) => m.username)
    .slice(0, 8)
}
