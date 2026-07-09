import * as cheerio from 'cheerio'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { splitNameYear } from '../src/lib/filmKey.js'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Scraping d'un profil PUBLIC Letterboxd (pas d'API officielle).
//
// Structure HTML confirmée sur de vraies pages :
//   - Chaque film est un composant React `LazyPoster` portant :
//       data-item-full-display-name = "Titre (Année)"
//       data-item-slug, data-item-link, data-postered-identifier (JSON -> uid)
//   - La note vit dans un <p class="poster-viewingdata" data-item-uid="film:ID">
//     contenant <span class="rating rated-N"> (N de 1 à 10 -> N/2 étoiles).
//   => On joint film <-> note par l'uid "film:ID".
//
// Pages utilisées :
//   /{user}/            -> favoris (section #favourites)
//   /{user}/films/      -> tous les films vus + notes (paginé, 72/page)
//   /{user}/likes/films/-> films likés (paginé)
//
// Renvoie un objet sérialisable (films en tableau) consommé par le client.
// ---------------------------------------------------------------------------

const BASE = 'https://letterboxd.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const MAX_PAGES = 100 // garde-fou
const PAGE_SIZE = 72 // posters par page Letterboxd
const CONCURRENCY = 3 // au-delà, Cloudflare rate-limit (403)
const RETRIES = 4
// Budget temps global d'un scrape : sur Vercel (plan Hobby, Fluid compute) une
// fonction est tuée à maxDuration=300s. On s'arrête AVANT, avec une erreur
// claire, plutôt que de laisser la plateforme timeouter en silence.
const SCRAPE_BUDGET_MS = Number(process.env.SCRAPE_BUDGET_MS) || 270_000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function budgetError() {
  const err = new Error(
    'Ce profil est très volumineux : la lecture dépasse le temps autorisé. ' +
      'Réessaie (le cache aidera) ou passe par l’import CSV pour ce profil.',
  )
  err.code = 'TOO_LARGE'
  return err
}

// Letterboxd (Cloudflare) bloque l'empreinte TLS du client HTTP de Node (403),
// alors que curl passe. On délègue donc la requête à curl, présent nativement
// sur Windows 10+/macOS/Linux. Le code HTTP est ajouté en fin de sortie via -w.
async function curlOnce(url) {
  let stdout
  try {
    ;({ stdout } = await execFileAsync(
      'curl',
      [
        '-sS',
        '--compressed',
        '-A',
        UA,
        '-H',
        'Accept-Language: en-US,en;q=0.9',
        '-w',
        '\n%{http_code}',
        url,
      ],
      { maxBuffer: 50 * 1024 * 1024 },
    ))
  } catch (e) {
    // ENOENT = binaire curl absent du runtime (ne devrait pas arriver : vérifié
    // présent sur Vercel/Amazon Linux, Windows 10+, macOS — mais on veut une
    // erreur explicite côté utilisateur si ça change un jour).
    const err = new Error(
      e.code === 'ENOENT'
        ? 'curl est absent de l’environnement serveur : le mode « pseudo public » est indisponible. Utilise l’import CSV.'
        : `Échec réseau vers Letterboxd : ${e.message}`,
    )
    if (e.code === 'ENOENT') err.code = 'CURL_MISSING'
    throw err
  }
  const nl = stdout.lastIndexOf('\n')
  return { status: parseInt(stdout.slice(nl + 1).trim(), 10), body: stdout.slice(0, nl) }
}

async function fetchHtml(path, deadline = Infinity) {
  if (Date.now() > deadline) throw budgetError()
  const url = BASE + path
  let lastStatus
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const { status, body } = await curlOnce(url)
    lastStatus = status

    if (status === 404) {
      const err = new Error(`Profil introuvable (404) : ${path}`)
      err.code = 'NOT_FOUND'
      throw err
    }
    if (status >= 200 && status < 300) return body

    // 403 / 429 = rate-limit Cloudflare -> backoff exponentiel puis retry.
    if ((status === 403 || status === 429) && attempt < RETRIES) {
      if (Date.now() > deadline) throw budgetError()
      await sleep(800 * 2 ** attempt) // 0.8s, 1.6s, 3.2s, 6.4s
      continue
    }
    break
  }
  const err = new Error(`Letterboxd a répondu ${lastStatus} pour ${path} (rate-limit ?)`)
  if (lastStatus === 403 || lastStatus === 429) err.code = 'RATE_LIMITED'
  throw err
}

// Exécute des tâches async avec une concurrence limitée (politesse + vitesse).
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

// Extrait les films (LazyPoster) d'un document, avec leur uid pour le join.
function parsePosters($, scope) {
  const root = scope ? $(scope) : $.root()
  const posters = []
  root.find('[data-component-class="LazyPoster"]').each((_, el) => {
    const $el = $(el)
    const display =
      $el.attr('data-item-full-display-name') || $el.attr('data-item-name') || ''
    const { name, year } = splitNameYear(display)
    if (!name) return
    const slug = $el.attr('data-item-slug')
    const link = $el.attr('data-item-link') || (slug ? `/film/${slug}/` : null)

    let uid = null
    const ident = $el.attr('data-postered-identifier')
    if (ident) {
      try {
        uid = JSON.parse(ident).uid // cheerio décode déjà les entités HTML
      } catch {
        /* ignore */
      }
    }

    posters.push({
      uid,
      name,
      year,
      uri: link ? BASE + link : null,
    })
  })
  return posters
}

// Vrai poster (format portrait 2:3) depuis le JSON-LD de la page film :
//   "image":"https://a.ltrbxd.com/resized/.../...-0-230-0-345-crop.jpg"
// Plus fiable que og:image (qui renvoie parfois l'image sociale / backdrop).
function extractPoster(html) {
  const m = html.match(/"image":"(https:\/\/a\.ltrbxd\.com\/resized\/[^"]+?\.jpg[^"]*)"/)
  if (!m) return null
  return m[1].replace(/\\\//g, '/')
}

// uid "film:ID" -> note, depuis les <p class="poster-viewingdata">.
function parseRatings($) {
  const byUid = new Map()
  $('.poster-viewingdata').each((_, el) => {
    const $el = $(el)
    const uid = $el.attr('data-item-uid')
    if (!uid) return
    const cls = $el.find('.rating').attr('class') || ''
    const m = cls.match(/rated-(\d+)/)
    if (m) byUid.set(uid, parseInt(m[1], 10) / 2)
  })
  return byUid
}

// Dernière page numérotée si la pagination expose des numéros (page films),
// sinon 1 (la page likes n'a qu'un next/prev -> parcours séquentiel).
function numberedLastPage($) {
  let max = 1
  // Uniquement la liste de numéros (.paginate-pages) : surtout PAS le lien
  // "next" (.paginate-nextprev), qui pointe vers page/2 et fausserait le total.
  $('.paginate-pages a').each((_, el) => {
    const m = ($(el).attr('href') || '').match(/\/page\/(\d+)\//)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return Math.min(max, MAX_PAGES)
}

// Scrape une section paginée. Deux styles de pagination existent :
//   - numérotée (films) -> on lit le dernier numéro et on parallélise.
//   - next/prev (likes)  -> on enchaîne tant qu'une page est "pleine" (72).
async function scrapePaginated(basePath, { withRatings, deadline } = {}) {
  const all = []
  const ratings = new Map()
  const ingest = ($) => {
    const posters = parsePosters($)
    all.push(...posters)
    if (withRatings) for (const [k, v] of parseRatings($)) ratings.set(k, v)
    return posters.length
  }

  const $first = cheerio.load(await fetchHtml(`${basePath}page/1/`, deadline))
  const firstCount = ingest($first)
  const numbered = numberedLastPage($first)

  if (numbered > 1) {
    // Chemin rapide : pages connues, fetch en parallèle (concurrence limitée).
    const rest = Array.from({ length: numbered - 1 }, (_, i) => i + 2)
    const htmls = await mapLimit(rest, CONCURRENCY, (p) =>
      fetchHtml(`${basePath}page/${p}/`, deadline),
    )
    for (const html of htmls) ingest(cheerio.load(html))
  } else if (firstCount >= PAGE_SIZE) {
    // Pagination next/prev : on avance jusqu'à une page incomplète.
    let page = 2
    let count = firstCount
    while (count >= PAGE_SIZE && page <= MAX_PAGES) {
      const $ = cheerio.load(await fetchHtml(`${basePath}page/${page}/`, deadline))
      count = ingest($)
      page++
    }
  }

  return { posters: all, ratings }
}

/**
 * Scrape un profil public et renvoie un objet Profile sérialisable.
 * @param {string} username
 * @returns {Promise<{username:string, films:Array, favorites:Array}>}
 */
export async function scrapeProfile(username) {
  const user = username.trim().toLowerCase().replace(/^@/, '')
  if (!user || /[^a-z0-9_]/.test(user)) {
    const err = new Error('Pseudo Letterboxd invalide.')
    err.code = 'BAD_USERNAME'
    throw err
  }

  const deadline = Date.now() + SCRAPE_BUDGET_MS

  // 1) Page profil : favoris + avatar + nom affiché.
  const profileHtml = await fetchHtml(`/${user}/`, deadline)
  const $profile = cheerio.load(profileHtml)
  const favPosters = parsePosters($profile, '#favourites').slice(0, 4)
  const avatarUrl =
    $profile('meta[property="og:image"]').attr('content') ||
    $profile('.profile-avatar img').attr('src') ||
    null
  const displayName = ($profile('.profile-avatar img').attr('alt') || '').trim()

  // 2) Posters des favoris MAINTENANT (IP encore "fraîche", avant la pagination
  //    lourde qui déclenche le rate-limit). Cosmétique -> échec toléré.
  await mapLimit(favPosters, CONCURRENCY, async (p) => {
    if (!p.uri) return
    try {
      const { status, body } = await curlOnce(p.uri)
      if (status >= 200 && status < 300) p.posterUrl = extractPoster(body)
    } catch {
      /* poster optionnel */
    }
  })

  // 3) Films (triés par date de visionnage -> récence) + likes.
  const filmsData = await scrapePaginated(`/${user}/films/by/date/`, {
    withRatings: true,
    deadline,
  })
  const likesData = await scrapePaginated(`/${user}/likes/films/`, { deadline }).catch(
    (e) => {
      // Le budget temps doit remonter (résultat sinon incomplet en silence) ;
      // les autres échecs sur les likes restent tolérés (cosmétique).
      if (e.code === 'TOO_LARGE') throw e
      return { posters: [] }
    },
  )

  // Construit la liste des films (clé d'unicité = nom+année via une Map locale).
  const films = new Map()
  const keyOf = (name, year) => `${name.toLowerCase()}__${year ?? ''}`

  for (const p of filmsData.posters) {
    const k = keyOf(p.name, p.year)
    if (!films.has(k)) {
      films.set(k, {
        uri: p.uri,
        name: p.name,
        year: p.year,
        rating: p.uid != null ? (filmsData.ratings.get(p.uid) ?? null) : null,
        watched: true,
        liked: false,
        isFavorite: false,
      })
    }
  }

  for (const p of likesData.posters) {
    const k = keyOf(p.name, p.year)
    const f = films.get(k)
    if (f) f.liked = true
    else
      films.set(k, {
        uri: p.uri,
        name: p.name,
        year: p.year,
        rating: null,
        watched: true, // un film liké a forcément été vu
        liked: true,
        isFavorite: false,
      })
  }

  const favorites = favPosters.map((p) => {
    const k = keyOf(p.name, p.year)
    const f = films.get(k)
    if (f) f.isFavorite = true
    return { uri: p.uri, name: p.name, year: p.year, posterUrl: p.posterUrl ?? null }
  })

  if (films.size === 0) {
    const err = new Error(
      `Aucun film trouvé pour « ${username} ». Le profil est peut-être privé, vide, ou le pseudo incorrect.`,
    )
    err.code = 'EMPTY'
    throw err
  }

  return {
    username: displayName || username.trim(),
    profileUrl: `${BASE}/${user}/`,
    avatarUrl,
    films: [...films.values()],
    favorites,
  }
}
