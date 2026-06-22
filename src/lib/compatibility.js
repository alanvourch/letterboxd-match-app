// ---------------------------------------------------------------------------
// Moteur de compatibilité — fonctions PURES (Profiles -> résultat).
// Aucune dépendance à React, facile à tester unitairement.
// ---------------------------------------------------------------------------
import { filmKey } from './filmKey.js'

const LOVED_THRESHOLD = 4.5 // note à partir de laquelle on considère un film "adoré"
const DIVISIVE_THRESHOLD = 2 // écart de notes pour considérer un film "clivant"
const MIN_RATINGS_FOR_TASTE = 10 // en-dessous, la corrélation est peu fiable

// Coefficient de corrélation de Pearson sur deux séries appariées.
export function pearson(xs, ys) {
  const n = xs.length
  if (n < 2) return null
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0
  let dx2 = 0
  let dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  if (denom === 0) return null // au moins une série constante
  return num / denom
}

const isWatched = (f) => f.watched || f.rating != null || f.liked

function watchedUris(profile) {
  const set = new Set()
  for (const [uri, film] of profile.films) {
    if (isWatched(film)) set.add(uri)
  }
  return set
}

function label(score) {
  if (score >= 80) return { title: 'Âmes sœurs cinéphiles', tone: 'green' }
  if (score >= 60) return { title: 'Belle complicité', tone: 'green' }
  if (score >= 40) return { title: 'Goûts complémentaires', tone: 'blue' }
  if (score >= 20) return { title: 'Sur des planètes différentes', tone: 'orange' }
  return { title: 'Opposés qui s’attirent', tone: 'orange' }
}

function sortByRatingAsc(films) {
  return [...films].sort(
    (a, b) => (a.rating ?? 99) - (b.rating ?? 99) || a.name.localeCompare(b.name),
  )
}

/**
 * Compare deux profils et renvoie l'ensemble des métriques de compatibilité.
 * @param {Profile} a
 * @param {Profile} b
 */
export function computeCompatibility(a, b) {
  const watchedA = watchedUris(a)
  const watchedB = watchedUris(b)

  // --- Overlap des films vus (Jaccard) ---
  const common = [...watchedA].filter((uri) => watchedB.has(uri))
  const union = new Set([...watchedA, ...watchedB])
  const jaccard = union.size ? common.length / union.size : 0

  // --- Notes en commun -> corrélation + écart moyen ---
  // NB: `common` contient des CLÉS canoniques (nom+année), pas des URIs.
  // On expose toujours la vraie URI du film (fa.uri) pour les liens.
  const ratedPairs = []
  for (const key of common) {
    const fa = a.films.get(key)
    const fb = b.films.get(key)
    if (fa.rating != null && fb.rating != null) {
      ratedPairs.push({
        uri: fa.uri ?? fb.uri,
        name: fa.name,
        year: fa.year ?? fb.year,
        ratingA: fa.rating,
        ratingB: fb.rating,
        diff: Math.abs(fa.rating - fb.rating),
      })
    }
  }

  const correlation = pearson(
    ratedPairs.map((p) => p.ratingA),
    ratedPairs.map((p) => p.ratingB),
  )
  const meanDiff = ratedPairs.length
    ? ratedPairs.reduce((s, p) => s + p.diff, 0) / ratedPairs.length
    : null
  // Biais signé : moyenne (note A - note B). Positif => A note plus généreusement.
  const ratingBias = ratedPairs.length
    ? ratedPairs.reduce((s, p) => s + (p.ratingA - p.ratingB), 0) / ratedPairs.length
    : null

  // --- Films adorés en commun (5★ des deux OU likés des deux) ---
  const lovedInCommon = common
    .map((key) => ({ a: a.films.get(key), b: b.films.get(key) }))
    .filter(
      ({ a: fa, b: fb }) =>
        (fa.rating >= LOVED_THRESHOLD && fb.rating >= LOVED_THRESHOLD) ||
        (fa.liked && fb.liked),
    )
    .map(({ a: fa, b: fb }) => ({
      uri: fa.uri ?? fb.uri,
      name: fa.name,
      year: fa.year ?? fb.year,
      ratingA: fa.rating,
      ratingB: fb.rating,
      likedBoth: fa.liked && fb.liked,
    }))
    .sort(
      (x, y) =>
        (y.ratingA ?? 0) + (y.ratingB ?? 0) - ((x.ratingA ?? 0) + (x.ratingB ?? 0)),
    )

  // --- Films clivants (gros écart de notes) ---
  const divisive = ratedPairs
    .filter((p) => p.diff >= DIVISIVE_THRESHOLD)
    .sort((x, y) => y.diff - x.diff)

  // --- Derniers coups de cœur (récents) + Flop de chacun ---
  const ratedFilms = (profile) =>
    [...profile.films.values()].filter((f) => f.rating != null)

  // Films adorés (4.5★+ ou likés), du plus récent au plus ancien.
  // Récence : via `date` (CSV) si dispo, sinon ordre d'insertion (le scraping
  // alimente déjà la Map par date de visionnage décroissante).
  const recentLoved = (profile) => {
    const loved = [...profile.films.values()].filter(
      (f) => (f.rating != null && f.rating >= LOVED_THRESHOLD) || f.liked,
    )
    const hasDates = loved.some((f) => f.date)
    const ordered = hasDates
      ? [...loved].sort((x, y) => (y.date || '').localeCompare(x.date || ''))
      : loved
    return ordered.slice(0, 10)
  }

  const flopA = sortByRatingAsc(ratedFilms(a)).slice(0, 10)
  const flopB = sortByRatingAsc(ratedFilms(b)).slice(0, 10)

  // --- Recommandations : pépites d'un user que l'autre n'a PAS vues ---
  // (note >= 4 OU likée). Tri par note puis like. À faire découvrir à l'autre.
  const gemsFor = (from, otherWatched) =>
    [...from.films.values()]
      .filter((f) => !otherWatched.has(filmKey(f.name, f.year)))
      .filter((f) => (f.rating != null && f.rating >= 4) || f.liked)
      .map((f) => ({
        uri: f.uri,
        name: f.name,
        year: f.year,
        rating: f.rating,
        liked: f.liked,
      }))
      .sort(
        (x, y) =>
          (y.rating ?? (y.liked ? 4 : 0)) - (x.rating ?? (x.liked ? 4 : 0)) ||
          Number(y.liked) - Number(x.liked) ||
          x.name.localeCompare(y.name),
      )
      .slice(0, 5)

  const recommendations = {
    aToB: gemsFor(a, watchedB), // pépites de A à faire découvrir à B
    bToA: gemsFor(b, watchedA),
  }

  // --- Favoris partagés ---
  // Match par nom+année (et non par URI) : les URIs diffèrent selon la source
  // (boxd.it pour le CSV, letterboxd.com pour le scraping).
  const favKeyB = new Set(b.favorites.map((f) => filmKey(f.name, f.year)))
  const sharedFavorites = a.favorites.filter((f) => favKeyB.has(filmKey(f.name, f.year)))

  // --- Score global ---
  const enoughRatings = ratedPairs.length >= MIN_RATINGS_FOR_TASTE
  const overlapScore = jaccard * 100
  let score
  if (correlation != null && enoughRatings) {
    const tasteScore = ((correlation + 1) / 2) * 100
    score = Math.round(0.7 * tasteScore + 0.3 * overlapScore)
  } else if (correlation != null) {
    // peu de notes communes : on pondère moins le goût
    const tasteScore = ((correlation + 1) / 2) * 100
    score = Math.round(0.4 * tasteScore + 0.6 * overlapScore)
  } else {
    // aucune note comparable : on se rabat sur l'overlap seul
    score = Math.round(overlapScore)
  }
  score = Math.max(0, Math.min(100, score))

  return {
    profiles: {
      a: {
        username: a.username,
        watchedCount: watchedA.size,
        profileUrl: a.profileUrl ?? null,
        avatarUrl: a.avatarUrl ?? null,
      },
      b: {
        username: b.username,
        watchedCount: watchedB.size,
        profileUrl: b.profileUrl ?? null,
        avatarUrl: b.avatarUrl ?? null,
      },
    },
    score,
    label: label(score),
    overlap: {
      common: common.length,
      union: union.size,
      jaccard,
      pctOfA: watchedA.size ? common.length / watchedA.size : 0,
      pctOfB: watchedB.size ? common.length / watchedB.size : 0,
    },
    taste: {
      correlation,
      meanDiff,
      ratingBias,
      sampleSize: ratedPairs.length,
      reliable: enoughRatings,
    },
    lovedInCommon,
    divisive,
    recommendations,
    recentLoved: { a: recentLoved(a), b: recentLoved(b) },
    flop: { a: flopA, b: flopB },
    favorites: { a: a.favorites, b: b.favorites, shared: sharedFavorites },
  }
}
