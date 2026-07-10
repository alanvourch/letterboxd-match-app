import { useEffect, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import UploadStep from './components/UploadStep.jsx'
import ResultsDashboard from './components/ResultsDashboard.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import { loadProfile, detectSource } from './lib/loadProfile.js'
import { computeCompatibility } from './lib/compatibility.js'
import { enrichResult } from './lib/enrich.js'

// letterboxd.com/<handle>/ -> handle (pour construire un lien partageable propre)
const handleOf = (profile) =>
  profile.profileUrl?.match(/letterboxd\.com\/([^/]+)\/?$/)?.[1] ?? null

export default function App() {
  const [result, setResult] = useState(null)
  const [enrichMap, setEnrichMap] = useState(null)
  const [enriching, setEnriching] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState(null)
  const enrichSeq = useRef(0)

  // Lien partagé ?a=<pseudo>&b=<pseudo> : lance la comparaison à l'arrivée.
  const params = new URLSearchParams(window.location.search)
  const initial = { a: params.get('a') || '', b: params.get('b') || '' }
  const autoLaunched = useRef(false)
  useEffect(() => {
    if (autoLaunched.current || !initial.a || !initial.b) return
    autoLaunched.current = true
    handleCompare(
      { mode: 'public', username: initial.a },
      { mode: 'public', username: initial.b },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Transforme l'état d'un côté de l'UI en `source` pour loadProfile.
  function toSource(side) {
    if (side.mode === 'public') {
      return { type: 'public', username: side.username.trim() }
    }
    return { ...detectSource(side.files), username: side.username.trim() }
  }

  async function handleCompare(sideA, sideB) {
    setLoading(true)
    setScraping(sideA.mode === 'public' || sideB.mode === 'public')
    setError(null)
    try {
      // Séquentiel (et non Promise.all) : deux scrapes simultanés doublent le
      // rythme des requêtes et déclenchent le rate-limit de Letterboxd, ce qui
      // peut vider silencieusement les likes d'un des profils.
      const profileA = await loadProfile(toSource(sideA))
      const profileB = await loadProfile(toSource(sideB))

      const res = computeCompatibility(profileA, profileB)
      setResult(res)
      window.scrollTo({ top: 0 })

      // Lien partageable seulement si les deux profils sont publics
      // (jamais d'URL pour un CSV : données privées).
      const ha = sideA.mode === 'public' ? handleOf(profileA) : null
      const hb = sideB.mode === 'public' ? handleOf(profileB) : null
      if (ha && hb) {
        const url = `${window.location.origin}/?a=${encodeURIComponent(ha)}&b=${encodeURIComponent(hb)}`
        setShareUrl(url)
        window.history.replaceState(null, '', `/?a=${encodeURIComponent(ha)}&b=${encodeURIComponent(hb)}`)
      } else {
        setShareUrl(null)
        window.history.replaceState(null, '', '/')
      }

      // Enrichissement TMDB en arrière-plan : le dashboard s'affiche tout de
      // suite, les affiches et insights arrivent quand ils sont prêts.
      const seq = ++enrichSeq.current
      setEnrichMap(null)
      setEnriching(true)
      enrichResult(res).then((map) => {
        if (enrichSeq.current !== seq) return // une autre comparaison est partie
        setEnrichMap(map)
        setEnriching(false)
      })
    } catch (e) {
      console.error(e)
      setError(e.message || 'Une erreur est survenue lors de l’analyse.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    enrichSeq.current++
    setResult(null)
    setEnrichMap(null)
    setEnriching(false)
    setShareUrl(null)
    setError(null)
    window.history.replaceState(null, '', '/')
  }

  return (
    <div className="flex min-h-full flex-col">
      {loading && <LoadingOverlay scraping={scraping} />}
      <Header onHome={handleReset} />
      <main className="flex-1">
        {result ? (
          <ResultsDashboard
            result={result}
            enrichMap={enrichMap}
            enriching={enriching}
            shareUrl={shareUrl}
            onReset={handleReset}
          />
        ) : (
          <UploadStep
            onCompare={handleCompare}
            loading={loading}
            error={error}
            initial={initial}
          />
        )}
      </main>
      <footer className="border-t border-line/60 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center text-xs text-faint">
          <p>
            Projet indépendant, non affilié à Letterboxd. Les exports CSV sont analysés
            dans le navigateur — aucune donnée personnelle n'est envoyée ni conservée.
          </p>
          <p className="flex items-center justify-center gap-2">
            <svg
              viewBox="0 0 190 81"
              className="h-3 w-auto"
              role="img"
              aria-label="TMDB"
            >
              <rect width="190" height="81" rx="12" fill="#0d253f" />
              <text
                x="95"
                y="55"
                textAnchor="middle"
                fontFamily="Archivo, sans-serif"
                fontWeight="800"
                fontSize="40"
                fill="#01b4e4"
              >
                TMDB
              </text>
            </svg>
            <span>
              Affiches et métadonnées fournies par TMDB. This product uses the TMDB API
              but is not endorsed or certified by TMDB.
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}
