// Teste le scraper contre un vrai profil public et compare le résultat au CSV
// du même utilisateur (doit donner un score très élevé : c'est la même personne).
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { scrapeProfile } from '../server/scrapeLetterboxd.js'
import { parseLooseCsvs } from '../src/lib/parseLetterboxd.js'
import { computeCompatibility } from '../src/lib/compatibility.js'
import { filmKey } from '../src/lib/filmKey.js'

const USERNAME = process.argv[2] || 'nashkel'
const DIR = 'letterboxd-nashkel-2026-06-22-00-45-utc'

// Reconstruit une Profile (films en Map) à partir de l'objet sérialisé du scrape.
function rebuild(serialized) {
  const films = new Map()
  for (const f of serialized.films) films.set(filmKey(f.name, f.year), f)
  return { username: serialized.username, films, favorites: serialized.favorites }
}

console.log(`Scraping de « ${USERNAME} »…`)
const t0 = Date.now()
const scraped = await scrapeProfile(USERNAME)
console.log(`✓ scrape en ${((Date.now() - t0) / 1000).toFixed(1)}s`)

console.log('Films scrapés     :', scraped.films.length)
console.log('  - notés          :', scraped.films.filter((f) => f.rating != null).length)
console.log('  - likés          :', scraped.films.filter((f) => f.liked).length)
console.log('Favoris           :', scraped.favorites.map((f) => `${f.name} (${f.year})`))

const scrapedProfile = rebuild(scraped)

// --- Compare scrape vs CSV du même user ---
async function fakeFile(rel, name) {
  return { name, text: async () => readFile(join(DIR, rel), 'utf8') }
}
const csvProfile = await parseLooseCsvs(
  await Promise.all([
    fakeFile('ratings.csv', 'ratings.csv'),
    fakeFile('watched.csv', 'watched.csv'),
    fakeFile('diary.csv', 'diary.csv'),
    fakeFile('likes/films.csv', 'likes.csv'),
    fakeFile('profile.csv', 'profile.csv'),
  ]),
  'CSV',
)

const res = computeCompatibility(scrapedProfile, csvProfile)
console.log('\n=== Scrape vs CSV (même personne) ===')
console.log('CSV films         :', csvProfile.films.size)
console.log('Score             :', res.score, '·', res.label.title)
console.log('Films communs     :', res.overlap.common, '/ union', res.overlap.union, '· Jaccard', res.overlap.jaccard.toFixed(2))
console.log('Corrélation       :', res.taste.correlation?.toFixed(3), 'sur', res.taste.sampleSize)
console.log('Écart moyen       :', res.taste.meanDiff?.toFixed(3))
console.log('Favoris partagés  :', res.favorites.shared.map((f) => f.name))

let ok = true
const check = (c, m) => {
  if (!c) {
    console.error('❌', m)
    ok = false
  }
}
check(scraped.films.length > 100, 'beaucoup de films scrapés attendus')
check(scraped.favorites.length === 4, `4 favoris attendus (${scraped.favorites.length})`)
check(res.overlap.jaccard > 0.85, `recoupement scrape/CSV devrait être très élevé (${res.overlap.jaccard.toFixed(2)})`)
check(res.taste.correlation > 0.9, `corrélation scrape/CSV devrait être ~1 (${res.taste.correlation?.toFixed(2)})`)
console.log(ok ? '\n✅ Scrape validé contre le CSV.' : '\n❌ Des écarts inattendus.')
if (!ok) process.exitCode = 1
