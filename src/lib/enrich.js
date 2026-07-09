import { filmKey } from './filmKey.js'

// ---------------------------------------------------------------------------
// Enrichissement TMDB côté client : choisit QUELS films envoyer au backend
// (l'API est plafonnée à 250 films / 120 credits par requête) puis renvoie
// une Map filmKey -> { posterPath, genreIds, directors, … }.
// L'enrichissement est un plus : tout échec renvoie null et l'UI dégrade.
// ---------------------------------------------------------------------------

const POSTER_BASE = 'https://image.tmdb.org/t/p/'

/** URL d'affiche TMDB (sizes: w92, w185, w342, w500). */
export function posterUrl(posterPath, size = 'w185') {
  return posterPath ? `${POSTER_BASE}${size}${posterPath}` : null
}

const MAX_FILMS = 250

/**
 * Construit la liste des films à enrichir à partir d'un résultat de
 * compatibilité : d'abord tout ce qui est AFFICHÉ (affiches), puis un
 * échantillon des films en commun (stats genres/réalisateurs), les films
 * co-notés les mieux notés d'abord.
 */
export function filmsToEnrich(result) {
  const seen = new Map()
  const add = (f, wantCredits = false) => {
    if (!f?.name || seen.size >= MAX_FILMS) return
    const k = filmKey(f.name, f.year)
    const cur = seen.get(k)
    if (cur) cur.wantCredits = cur.wantCredits || wantCredits
    else seen.set(k, { name: f.name, year: f.year ?? null, wantCredits })
  }

  // Films affichés (affiches nécessaires). Les listes "en commun" comptent
  // aussi pour les stats -> credits.
  result.favorites.a.forEach((f) => add(f))
  result.favorites.b.forEach((f) => add(f))
  result.lovedInCommon.slice(0, 12).forEach((f) => add(f, true))
  result.divisive.slice(0, 12).forEach((f) => add(f, true))
  result.recommendations.aToB.forEach((f) => add(f))
  result.recommendations.bToA.forEach((f) => add(f))
  result.recentLoved.a.forEach((f) => add(f))
  result.recentLoved.b.forEach((f) => add(f))
  result.flop.a.forEach((f) => add(f))
  result.flop.b.forEach((f) => add(f))

  // Échantillon de films communs pour les stats : co-notés d'abord, les mieux
  // notés en tête (ce sont eux qui définissent des "goûts partagés").
  const sample = [...result.commonFilms].sort((x, y) => {
    const bothX = x.ratingA != null && x.ratingB != null
    const bothY = y.ratingA != null && y.ratingB != null
    if (bothX !== bothY) return bothX ? -1 : 1
    return (y.ratingA ?? 0) + (y.ratingB ?? 0) - ((x.ratingA ?? 0) + (x.ratingB ?? 0))
  })
  for (const f of sample) {
    if (seen.size >= MAX_FILMS) break
    add(f, true)
  }

  return [...seen.values()]
}

/**
 * Enrichit un résultat via POST /api/enrich.
 * @returns {Promise<Map<string, object>|null>} Map filmKey -> infos TMDB,
 *          ou null si TMDB indisponible (pas de clé) / échec réseau.
 */
export async function enrichResult(result) {
  try {
    const res = await fetch('/api/enrich', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ films: filmsToEnrich(result) }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.available) return null

    const map = new Map()
    for (const f of data.films) {
      if (f.tmdbId != null) map.set(filmKey(f.name, f.year), f)
    }
    return map
  } catch {
    return null
  }
}
