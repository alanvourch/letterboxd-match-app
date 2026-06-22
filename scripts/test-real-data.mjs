// Test contre un VRAI export Letterboxd présent dans le repo.
// Valide le parsing (comptes, favoris, absence de doublons via diary) et le
// moteur de compatibilité (self-compare + variante modifiée).
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseLooseCsvs } from '../src/lib/parseLetterboxd.js'
import { computeCompatibility } from '../src/lib/compatibility.js'

const DIR = 'letterboxd-nashkel-2026-06-22-00-45-utc'

// Mime un objet File (name + text()) pour réutiliser parseLooseCsvs tel quel.
async function fakeFile(relPath, displayName) {
  const content = await readFile(join(DIR, relPath), 'utf8')
  return { name: displayName, text: async () => content }
}

const files = await Promise.all([
  fakeFile('ratings.csv', 'ratings.csv'),
  fakeFile('watched.csv', 'watched.csv'),
  fakeFile('diary.csv', 'diary.csv'),
  fakeFile('likes/films.csv', 'likes-films.csv'),
  fakeFile('profile.csv', 'profile.csv'),
])

const me = await parseLooseCsvs(files, '')

const films = [...me.films.values()]
const rated = films.filter((f) => f.rating != null)
const liked = films.filter((f) => f.liked)
const noUri = films.filter((f) => !f.uri)

console.log('=== Parsing du vrai profil ===')
console.log('Pseudo            :', me.username)
console.log('Films (uniques)   :', me.films.size)
console.log('  - notés          :', rated.length)
console.log('  - likés          :', liked.length)
console.log('  - sans URI       :', noUri.length, '(devrait être ~0)')
console.log('Favoris           :', me.favorites.length)
me.favorites.forEach((f) =>
  console.log('   ★', f.name, f.year ? `(${f.year})` : '', f.uri ? '' : '⚠️ non relié'),
)

// --- Détection de doublons potentiels (même film compté 2x) ---
const counts = new Map()
for (const f of films) {
  const k = `${f.name.toLowerCase()}__${f.year}`
  counts.set(k, (counts.get(k) || 0) + 1)
}
const dups = [...counts.entries()].filter(([, n]) => n > 1)
console.log('Doublons détectés :', dups.length)

// --- Self-compare : doit donner un score quasi parfait ---
const self = computeCompatibility(me, me)
console.log('\n=== Self-compare (sanity check) ===')
console.log('Score             :', self.score, '·', self.label.title)
console.log('Films communs     :', self.overlap.common, '/', self.overlap.union)
console.log('Corrélation       :', self.taste.correlation?.toFixed(3), '(attendu ~1)')
console.log('Top 3             :', self.top.a.slice(0, 3).map((f) => `${f.name} ${f.rating}★`))

// --- Variante modifiée : on bruite les notes d'une copie pour un vrai % ---
function tweak(profile, fn) {
  const films = new Map()
  for (const [k, f] of profile.films) films.set(k, { ...f })
  // on baisse ~40% des notes et on en supprime quelques films vus
  let i = 0
  for (const f of films.values()) {
    if (f.rating != null && i % 5 === 0) f.rating = Math.max(0.5, f.rating - 1.5)
    if (i % 7 === 0) {
      f.watched = false
      f.rating = null
      f.liked = false
    }
    i++
  }
  return { username: 'Clone bruité', films, favorites: profile.favorites }
}

const other = tweak(me)
const res = computeCompatibility(me, other)
console.log('\n=== Compare vs clone modifié (exemple réaliste) ===')
console.log('Score             :', res.score, '·', res.label.title)
console.log('Films communs     :', res.overlap.common, '· Jaccard', res.overlap.jaccard.toFixed(2))
console.log('Corrélation       :', res.taste.correlation?.toFixed(3), 'sur', res.taste.sampleSize)
console.log('Écart moyen       :', res.taste.meanDiff?.toFixed(2))
console.log('Biais signé (A-B) :', res.taste.ratingBias?.toFixed(2))
console.log('Clivants (top 3)  :', res.divisive.slice(0, 3).map((f) => `${f.name} Δ${f.diff}`))
console.log('Reco A→B (top 3)  :', res.recommendations.aToB.slice(0, 3).map((f) => `${f.name} ${f.rating ?? ''}★${f.liked ? '♥' : ''}`))
console.log('Reco B→A (top 3)  :', res.recommendations.bToA.slice(0, 3).map((f) => `${f.name} ${f.rating ?? ''}★${f.liked ? '♥' : ''}`))

// --- Assertions ---
let ok = true
const check = (c, m) => {
  if (!c) {
    console.error('❌', m)
    ok = false
  }
}
check(me.films.size > 50, 'devrait y avoir beaucoup de films')
check(noUri.length === 0, `tous les films devraient avoir une URI (${noUri.length} sans)`)
check(dups.length === 0, `aucun doublon attendu (${dups.length} trouvés)`)
check(me.favorites.length === 4, `4 favoris attendus (${me.favorites.length})`)
check(me.favorites.every((f) => f.uri && f.name && !f.name.startsWith('http')), 'favoris reliés à des films lisibles')
check(self.score >= 98, `self-compare devrait être ~100 (${self.score})`)
check(Math.abs(self.taste.correlation - 1) < 1e-6, 'self-corrélation ~1')

console.log(ok ? '\n✅ Tous les checks réels passent.' : '\n❌ Des checks ont échoué.')
if (!ok) process.exitCode = 1
