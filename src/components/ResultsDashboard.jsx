import ScoreHero from './ScoreHero.jsx'
import StatCard from './StatCard.jsx'
import SectionLovedDivisive from './SectionLovedDivisive.jsx'
import TopFlopCompare from './TopFlopCompare.jsx'
import FavoritesCompare from './FavoritesCompare.jsx'
import { pct, correlationLabel } from '../lib/format.js'

export default function ResultsDashboard({ result, onReset }) {
  const { profiles, score, label, overlap, taste, lovedInCommon, divisive, top, flop, favorites } =
    result
  const nameA = profiles.a.username
  const nameB = profiles.b.username

  const corrValue =
    taste.correlation == null ? '—' : (taste.correlation >= 0 ? '+' : '') + taste.correlation.toFixed(2)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div className="rounded-2xl border border-lb-border bg-lb-card/60 p-8">
        <ScoreHero score={score} label={label} usernameA={nameA} usernameB={nameB} />
      </div>

      {/* Métriques clés */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          value={overlap.common}
          label="Films vus en commun"
          hint={`sur ${overlap.union} au total`}
        />
        <StatCard
          value={pct(overlap.jaccard)}
          label="Taux de recoupement"
          hint={`${pct(overlap.pctOfA)} de ${nameA} · ${pct(overlap.pctOfB)} de ${nameB}`}
          tone="text-lb-blue"
        />
        <StatCard
          value={corrValue}
          label="Corrélation des notes"
          hint={correlationLabel(taste.correlation)}
          tone="text-lb-green"
        />
        <StatCard
          value={taste.meanDiff == null ? '—' : taste.meanDiff.toFixed(2)}
          label="Écart moyen de notes"
          hint={`sur ${taste.sampleSize} film${taste.sampleSize > 1 ? 's' : ''} notés`}
          tone="text-lb-orange"
        />
      </div>

      {!taste.reliable && taste.correlation != null && (
        <p className="-mt-6 text-center text-xs text-lb-muted">
          ⚠️ Seulement {taste.sampleSize} films notés en commun : la corrélation est
          indicative.
        </p>
      )}

      <SectionLovedDivisive
        loved={lovedInCommon}
        divisive={divisive}
        nameA={nameA}
        nameB={nameB}
      />

      <FavoritesCompare favorites={favorites} nameA={nameA} nameB={nameB} />

      <TopFlopCompare
        title="⭐ Top 10"
        subtitle="Films les mieux notés de chacun"
        a={top.a}
        b={top.b}
        nameA={nameA}
        nameB={nameB}
      />

      <TopFlopCompare
        title="💀 Flop 10"
        subtitle="Films les moins bien notés de chacun"
        a={flop.a}
        b={flop.b}
        nameA={nameA}
        nameB={nameB}
      />

      <div className="text-center">
        <button
          onClick={onReset}
          className="rounded-full border border-lb-border bg-lb-card px-6 py-2.5 font-medium text-lb-text transition hover:border-lb-blue hover:text-white"
        >
          ↺ Comparer d'autres profils
        </button>
      </div>
    </div>
  )
}
