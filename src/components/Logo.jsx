import { HEART_PATH } from '../lib/heartPath.js'

// Marque du site : les deux pastilles Letterboxd (vert = profil A,
// bleu = profil B) qui se chevauchent, et à l'intersection un CŒUR orange —
// le "match". Réutilisée par le header et l'overlay de chargement.

export default function Logo({ className = 'h-6 w-9' }) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#00e054" fillOpacity="0.85" />
      <circle cx="24" cy="12" r="11" fill="#40bcf4" fillOpacity="0.85" />
      <path
        d={HEART_PATH}
        fill="#ff8000"
        transform="translate(18 12.5) scale(0.62) translate(-12 -12)"
      />
    </svg>
  )
}
