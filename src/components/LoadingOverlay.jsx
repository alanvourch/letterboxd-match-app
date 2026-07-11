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
      {/* Le logo en pulsation : pastilles A/B et le cœur du match au milieu */}
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="h-4 w-4 animate-pulse rounded-full bg-green" />
        <svg viewBox="0 0 24 24" className="h-5 w-5 animate-pulse [animation-delay:200ms]">
          <path
            fill="#ff8000"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
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
