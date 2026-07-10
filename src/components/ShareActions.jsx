import { useState } from 'react'
import { downloadShareCard, shareCard } from '../lib/shareCard.js'

// Boutons de partage sous le score : carte PNG (télécharger / partage natif)
// et lien direct quand les deux profils sont publics (?a=&b=).
export default function ShareActions({ result, enrichMap, shareUrl }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.canShare

  async function handleCard() {
    setBusy(true)
    try {
      // Sur mobile on tente le partage natif, sinon téléchargement direct.
      const shared = canNativeShare && (await shareCard(result, enrichMap).catch(() => false))
      if (!shared) await downloadShareCard(result, enrichMap)
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponible : tant pis */
    }
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={handleCard}
        disabled={busy}
        className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-night transition hover:bg-orange disabled:opacity-50"
      >
        {busy ? 'Génération…' : '⤓ Carte à partager'}
      </button>
      {shareUrl && (
        <button
          onClick={handleCopy}
          className="rounded-full border border-line px-5 py-2 text-sm font-medium text-mut transition hover:border-orange hover:text-ink"
        >
          {copied ? '✓ Lien copié !' : 'Copier le lien'}
        </button>
      )}
    </div>
  )
}
