// Carte métrique réutilisable, avec une infobulle "?" optionnelle.
export default function StatCard({ value, label, hint, info, tone = 'text-white' }) {
  return (
    <div className="relative rounded-xl border border-lb-border bg-lb-card/70 p-4 text-center">
      {info && (
        <span className="group absolute right-2 top-2">
          <span className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-lb-border text-xs text-lb-muted hover:text-white">
            ?
          </span>
          <span className="pointer-events-none absolute right-0 top-7 z-10 w-56 rounded-lg border border-lb-border bg-lb-bg p-3 text-left text-xs font-normal leading-relaxed text-lb-text opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
            {info}
          </span>
        </span>
      )}
      <div className={`text-3xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-lb-text">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-lb-muted">{hint}</div>}
    </div>
  )
}
