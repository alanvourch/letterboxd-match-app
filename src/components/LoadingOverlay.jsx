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

// Overlay plein écran pendant l'analyse. La progression est *indéterminée*
// (on ne connaît pas l'avancement exact du scraping) : on montre une activité
// réelle + des messages de phase, sans pourcentage trompeur.
export default function LoadingOverlay({ scraping }) {
  const messages = scraping ? MESSAGES_SCRAPE : MESSAGES_LOCAL
  const [i, setI] = useState(0)

  useEffect(() => {
    setI(0)
    const step = scraping ? 3500 : 1200
    const id = setInterval(() => {
      // avance puis se fige sur le dernier message tant que ça charge
      setI((prev) => Math.min(prev + 1, messages.length - 1))
    }, step)
    return () => clearInterval(id)
  }, [scraping, messages.length])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-lb-bg/90 backdrop-blur-sm">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-lb-border border-t-lb-green" />

      <p className="mt-6 text-lg font-medium text-white">{messages[i]}</p>

      <div className="mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-lb-border">
        <div className="h-full w-1/3 animate-[indeterminate_1.3s_ease-in-out_infinite] rounded-full bg-lb-green" />
      </div>

      {scraping && (
        <p className="mt-4 max-w-xs text-center text-xs text-lb-muted">
          La lecture d'un profil public peut prendre de 10 à 30 secondes selon le
          nombre de films.
        </p>
      )}
    </div>
  )
}
