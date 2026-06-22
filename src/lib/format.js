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

// Décrit la corrélation de manière lisible.
export function correlationLabel(r) {
  if (r == null) return 'pas assez de notes communes'
  if (r >= 0.6) return 'goûts très alignés'
  if (r >= 0.3) return 'goûts plutôt proches'
  if (r >= -0.1) return 'goûts indépendants'
  if (r >= -0.4) return 'goûts qui divergent'
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
  green: 'text-lb-green',
  blue: 'text-lb-blue',
  orange: 'text-lb-orange',
}

export const toneRing = {
  green: 'ring-lb-green/40 shadow-[0_0_40px_-10px_rgba(0,224,84,0.5)]',
  blue: 'ring-lb-blue/40 shadow-[0_0_40px_-10px_rgba(64,188,244,0.5)]',
  orange: 'ring-lb-orange/40 shadow-[0_0_40px_-10px_rgba(255,128,0,0.5)]',
}
