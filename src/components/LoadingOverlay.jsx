import { useEffect, useState } from 'react'

const MESSAGES_SCRAPE = [
  'Connexion à Letterboxd…',
  'Récupération des films vus…',
  'Récupération des notes et des likes…',
  'Beaucoup de films à parcourir, ça avance…',
  'Presque fini : calcul de la compatibilité…',
]
const MESSAGES_LOCAL = [
  'Lecture des fichiers…',
  'Fusion des films, notes et likes…',
  'Calcul de la compatibilité…',
]

// Overlay plein écran pendant l'analyse. Progression *indéterminée* (on ne
// connaît pas l'avancement du scraping) : activité réelle + messages de phase.
export default function LoadingOverlay({ scraping }) {
  const messages = scraping ? MESSAGES_SCRAPE : MESSAGES_LOCAL
  const [i, setI] = useState(0)

  useEffect(() => {
    setI(0)
    const step = scraping ? 3500 : 1200
    const id = setInterval(() => {
      setI((prev) => Math.min(prev + 1, messages.length - 1))
    }, step)
    return () => clearInterval(id)
  }, [scraping, messages.length])

  return (
    <div
      role="status"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night/90 backdrop-blur-sm"
    >
      {/* Tri-points du logo en pulsation décalée */}
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="h-4 w-4 animate-pulse rounded-full bg-green" />
        <span className="h-4 w-4 animate-pulse rounded-full bg-orange [animation-delay:200ms]" />
        <span className="h-4 w-4 animate-pulse rounded-full bg-blue [animation-delay:400ms]" />
      </div>

      <p className="mt-6 font-display text-xl text-ink">{messages[i]}</p>

      <div className="mt-5 h-1 w-64 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-[indeterminate_1.3s_ease-in-out_infinite] rounded-full bg-orange" />
      </div>

      {scraping && (
        <p className="mt-4 max-w-xs text-center text-xs text-mut">
          La lecture d'un profil public prend de 10 à 30 secondes selon le nombre de
          films (les très gros profils, davantage).
        </p>
      )}
    </div>
  )
}
