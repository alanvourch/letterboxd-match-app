// Carte métrique réutilisable.
export default function StatCard({ value, label, hint, tone = 'text-white' }) {
  return (
    <div className="rounded-xl border border-lb-border bg-lb-card/70 p-4 text-center">
      <div className={`text-3xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-lb-text">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-lb-muted">{hint}</div>}
    </div>
  )
}
