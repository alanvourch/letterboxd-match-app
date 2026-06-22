import { useState } from 'react'
import UploadStep from './components/UploadStep.jsx'
import ResultsDashboard from './components/ResultsDashboard.jsx'
import { loadProfile, detectSource } from './lib/loadProfile.js'
import { computeCompatibility } from './lib/compatibility.js'

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Transforme l'état d'un côté de l'UI en `source` pour loadProfile.
  function toSource(side) {
    if (side.mode === 'public') {
      return { type: 'public', username: side.username.trim() }
    }
    return { ...detectSource(side.files), username: side.username.trim() }
  }

  async function handleCompare(sideA, sideB) {
    setLoading(true)
    setError(null)
    try {
      const [profileA, profileB] = await Promise.all([
        loadProfile(toSource(sideA)),
        loadProfile(toSource(sideB)),
      ])

      setResult(computeCompatibility(profileA, profileB))
    } catch (e) {
      console.error(e)
      setError(e.message || 'Une erreur est survenue lors de l’analyse.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-full">
      {result ? (
        <ResultsDashboard result={result} onReset={handleReset} />
      ) : (
        <UploadStep onCompare={handleCompare} loading={loading} error={error} />
      )}
      <footer className="pb-8 text-center text-xs text-lb-muted">
        Projet non affilié à Letterboxd · données traitées localement
      </footer>
    </div>
  )
}
