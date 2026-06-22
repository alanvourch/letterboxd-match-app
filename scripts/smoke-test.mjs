// Test fumée : génère un faux export Letterboxd (.zip), le parse, et calcule
// la compatibilité. Valide la chaîne complète hors navigateur.
import JSZip from 'jszip'
import { parseZip } from '../src/lib/parseLetterboxd.js'
import { computeCompatibility, pearson } from '../src/lib/compatibility.js'

// --- 1. Test unitaire de Pearson (corrélation parfaite attendue = 1) ---
const r = pearson([1, 2, 3, 4], [2, 4, 6, 8])
console.assert(Math.abs(r - 1) < 1e-9, `Pearson devrait valoir 1, obtenu ${r}`)
console.log('✓ pearson() corrélation parfaite =', r)

// --- 2. Génère deux faux exports .zip ---
function film(n) {
  return { name: `Film ${n}`, year: 2000 + n, uri: `https://boxd.it/film${n}` }
}

function makeZip({ ratings = [], watched = [], likes = [], favorites = [] }) {
  const zip = new JSZip()
  const head = 'Date,Name,Year,Letterboxd URI,Rating\n'
  zip.file(
    'ratings.csv',
    head +
      ratings
        .map((x) => `2020-01-01,${x.f.name},${x.f.year},${x.f.uri},${x.r}`)
        .join('\n'),
  )
  zip.file(
    'watched.csv',
    'Date,Name,Year,Letterboxd URI\n' +
      watched.map((f) => `2020-01-01,${f.name},${f.year},${f.uri}`).join('\n'),
  )
  zip.folder('likes').file(
    'films.csv',
    'Date,Name,Year,Letterboxd URI\n' +
      likes.map((f) => `2020-01-01,${f.name},${f.year},${f.uri}`).join('\n'),
  )
  // Letterboxd quote le champ "Favorite Films" car il contient des virgules.
  zip.file(
    'profile.csv',
    'Username,Favorite Films\nuser,"' + favorites.map((f) => f.uri).join(', ') + '"\n',
  )
  return zip.generateAsync({ type: 'nodebuffer' })
}

const f1 = film(1)
const f2 = film(2)
const f3 = film(3)
const f4 = film(4)
const f5 = film(5)

const zipA = await makeZip({
  ratings: [
    { f: f1, r: 5 },
    { f: f2, r: 4 },
    { f: f3, r: 1 },
    { f: f4, r: 3 },
  ],
  watched: [f1, f2, f3, f4],
  likes: [f1],
  favorites: [f1, f2],
})

const zipB = await makeZip({
  ratings: [
    { f: f1, r: 5 },
    { f: f2, r: 4.5 },
    { f: f3, r: 4 }, // gros désaccord avec A (1 vs 4)
    { f: f5, r: 2 },
  ],
  watched: [f1, f2, f3, f5],
  likes: [f1],
  favorites: [f1, f5],
})

const profileA = await parseZip(zipA, 'Alice')
const profileB = await parseZip(zipB, 'Bob')

console.log('✓ profil A:', profileA.username, '— films:', profileA.films.size, '— favoris:', profileA.favorites.length)
console.log('✓ profil B:', profileB.username, '— films:', profileB.films.size, '— favoris:', profileB.favorites.length)

const res = computeCompatibility(profileA, profileB)

console.log('\n--- Résultat ---')
console.log('Score:', res.score, '·', res.label.title)
console.log('Films communs:', res.overlap.common, '/ union', res.overlap.union, '· Jaccard', res.overlap.jaccard.toFixed(2))
console.log('Corrélation:', res.taste.correlation?.toFixed(2), 'sur', res.taste.sampleSize, 'films')
console.log('Écart moyen:', res.taste.meanDiff?.toFixed(2))
console.log('Adorés en commun:', res.lovedInCommon.map((x) => x.name))
console.log('Clivants:', res.divisive.map((x) => `${x.name} (Δ${x.diff})`))
console.log('Favoris partagés:', res.favorites.shared.map((x) => x.name))

// --- 3. Assertions (échouent vraiment si fausses) ---
function check(cond, msg) {
  if (!cond) {
    console.error('❌ ÉCHEC:', msg)
    process.exitCode = 1
  }
}
check(res.overlap.common === 3, `attendu 3 communs (f1,f2,f3), obtenu ${res.overlap.common}`)
check(res.overlap.union === 5, `attendu union 5, obtenu ${res.overlap.union}`)
check(profileA.favorites.length === 2, `A devrait avoir 2 favoris, obtenu ${profileA.favorites.length}`)
check(res.lovedInCommon.some((x) => x.uri === f1.uri), 'f1 devrait être adoré en commun')
check(res.divisive.some((x) => x.uri === f3.uri && x.diff === 3), 'f3 devrait être clivant (Δ3)')
check(res.favorites.shared.some((x) => x.uri === f1.uri), 'f1 devrait être favori partagé')
check(res.score >= 0 && res.score <= 100, 'score borné 0-100')
if (!process.exitCode) console.log('\n✅ Tous les checks sont passés.')
