import { filmKey } from './filmKey.js'
import { TMDB_GENRES } from './tmdbGenres.js'

// ---------------------------------------------------------------------------
// Insights genres / réalisateurs — fonctions PURES : (films en commun +
// Map d'enrichissement TMDB) -> objets prêts à afficher. Calculés sur le
// sous-ensemble des films VUS PAR LES DEUX (le seul enrichi), ce que l'UI
// annonce explicitement.
// ---------------------------------------------------------------------------

const MIN_GENRE_FILMS = 4 // en-dessous, une moyenne par genre ne veut rien dire
const MIN_GENRE_RATED = 4

/**
 * Statistiques par genre sur les films en commun.
 * @returns {{ rows, signature, accord, clash } | null}
 *   rows      : genres triés par volume [{ id, name, n, ratedN, meanA, meanB, coLoved }]
 *   signature : genre le plus co-adoré (votre genre à vous deux)
 *   accord    : genre co-noté où vos moyennes sont les plus proches ET hautes
 *   clash     : genre co-noté où vos moyennes divergent le plus
 */
export function genreInsights(commonFilms, enrichMap) {
  if (!enrichMap) return null
  const byGenre = new Map()

  for (const f of commonFilms) {
    const info = enrichMap.get(filmKey(f.name, f.year))
    if (!info?.genreIds?.length) continue
    const bothRated = f.ratingA != null && f.ratingB != null
    const coLoved =
      (f.ratingA >= 4.5 && f.ratingB >= 4.5) || (f.likedA && f.likedB)
    for (const id of info.genreIds) {
      const g = byGenre.get(id) || { id, n: 0, ratedN: 0, sumA: 0, sumB: 0, coLoved: 0 }
      g.n++
      if (bothRated) {
        g.ratedN++
        g.sumA += f.ratingA
        g.sumB += f.ratingB
      }
      if (coLoved) g.coLoved++
      byGenre.set(id, g)
    }
  }

  const rows = [...byGenre.values()]
    .filter((g) => g.n >= MIN_GENRE_FILMS && TMDB_GENRES[g.id])
    .map((g) => ({
      id: g.id,
      name: TMDB_GENRES[g.id],
      n: g.n,
      ratedN: g.ratedN,
      meanA: g.ratedN ? g.sumA / g.ratedN : null,
      meanB: g.ratedN ? g.sumB / g.ratedN : null,
      coLoved: g.coLoved,
    }))
    .sort((x, y) => y.n - x.n)

  if (!rows.length) return null

  const rated = rows.filter((g) => g.ratedN >= MIN_GENRE_RATED)
  const signature =
    [...rows].sort((x, y) => y.coLoved - x.coLoved || y.n - x.n)[0] ?? null
  const accord =
    [...rated]
      .filter((g) => g.meanA != null)
      .sort(
        (x, y) =>
          Math.abs(x.meanA - x.meanB) - Math.abs(y.meanA - y.meanB) ||
          y.meanA + y.meanB - (x.meanA + x.meanB),
      )[0] ?? null
  const clash =
    [...rated]
      .filter((g) => g.meanA != null && Math.abs(g.meanA - g.meanB) >= 0.4)
      .sort((x, y) => Math.abs(y.meanA - y.meanB) - Math.abs(x.meanA - x.meanB))[0] ??
    null

  return { rows: rows.slice(0, 8), signature, accord, clash }
}

/**
 * Réalisateurs présents dans plusieurs films vus en commun, avec la note
 * moyenne conjointe. Triés par nombre de films puis par moyenne.
 * @returns {Array<{ name, n, mean, films }>}
 */
export function directorInsights(commonFilms, enrichMap) {
  if (!enrichMap) return []
  const byDirector = new Map()

  for (const f of commonFilms) {
    const info = enrichMap.get(filmKey(f.name, f.year))
    if (!info?.directors?.length) continue
    for (const name of info.directors) {
      const d = byDirector.get(name) || { name, n: 0, ratedN: 0, sum: 0, films: [] }
      d.n++
      if (f.ratingA != null && f.ratingB != null) {
        d.ratedN++
        d.sum += (f.ratingA + f.ratingB) / 2
      }
      if (d.films.length < 4) d.films.push(f.name)
      byDirector.set(name, d)
    }
  }

  return [...byDirector.values()]
    .filter((d) => d.n >= 2)
    .map((d) => ({
      name: d.name,
      n: d.n,
      mean: d.ratedN ? d.sum / d.ratedN : null,
      films: d.films,
    }))
    .sort((x, y) => y.n - x.n || (y.mean ?? 0) - (x.mean ?? 0))
    .slice(0, 6)
}
