// Identité canonique d'un film, partagée entre le parsing CSV et le scraping.
// C'est la SEULE chose qui doit garantir qu'un même film a la même clé quelle
// que soit la source (CSV hors-ligne ou profil scrapé). D'où nom + année.

export function parseYear(raw) {
  if (raw == null || raw === '') return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function filmKey(name, year) {
  return `${(name || '').trim().toLowerCase()}__${parseYear(year) ?? ''}`
}

// Sépare "Titre (2006)" -> { name: "Titre", year: 2006 }. Le millésime est le
// dernier "(YYYY)" en fin de chaîne (un titre peut contenir des parenthèses).
export function splitNameYear(fullName) {
  if (!fullName) return { name: '', year: null }
  const m = fullName.match(/^(.*?)\s*\((\d{4})\)\s*$/)
  if (m) return { name: m[1].trim(), year: parseYear(m[2]) }
  return { name: fullName.trim(), year: null }
}
