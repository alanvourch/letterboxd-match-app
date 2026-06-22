import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// L'API publique v0 de Letterboxd répond à la recherche de membres SANS auth.
// (Le reste de l'API demande une clé ; ici on ne s'en sert que pour l'autocomplete.)
const API = 'https://api.letterboxd.com/api/v0/search'

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
  let stdout
  try {
    ;({ stdout } = await execFileAsync('curl', ['-sS', '--compressed', url], {
      maxBuffer: 8 * 1024 * 1024,
    }))
  } catch {
    return []
  }

  let data
  try {
    data = JSON.parse(stdout)
  } catch {
    return []
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
