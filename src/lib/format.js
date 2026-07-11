// Helpers de présentation (formatage notes, pourcentages, étoiles).

export function pct(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return Math.round(value * 100) + '%'
}

export function stars(rating) {
  if (rating == null) return '—'
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return '★'.repeat(full) + (half ? '½' : '')
}

export function ratingText(rating) {
  if (rating == null) return '—'
  return rating.toFixed(rating % 1 === 0 ? 0 : 1)
}

export function filmTitle(film) {
  return film.year ? `${film.name} (${film.year})` : film.name
}

// Décrit l'accord de notes (0-100) de manière lisible.
export function tasteLabel(score) {
  if (score == null) return 'pas assez de notes communes'
  if (score >= 80) return 'vous notez presque pareil'
  if (score >= 60) return 'goûts très proches'
  if (score >= 45) return 'goûts plutôt proches'
  if (score >= 30) return 'goûts qui divergent'
  return 'goûts opposés'
}

// Phrase expliquant qui note le plus généreusement (biais signé A - B).
export function biasText(bias, nameA, nameB) {
  if (bias == null) return null
  if (Math.abs(bias) < 0.1) return 'Vous notez avec la même générosité.'
  const [higher, lower] = bias > 0 ? [nameA, nameB] : [nameB, nameA]
  return `${higher} note en moyenne ${Math.abs(bias).toFixed(1)}★ plus haut que ${lower}.`
}

export const toneClasses = {
  green: 'text-green',
  blue: 'text-blue',
  orange: 'text-orange',
}

// Libellé d'une décennie : 1990 -> "années 90", 2000 -> "années 2000".
export function decadeLabel(decade) {
  if (decade == null) return '—'
  return decade < 2000 ? `années ${String(decade).slice(2)}` : `années ${decade}`
}
