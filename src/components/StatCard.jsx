// Carte métrique : eyebrow, grand chiffre, détail. L'infobulle "?" est un
// vrai bouton focusable (accessible au clavier), affichée au survol/focus.
export default function StatCard({ value, label, hint, info, tone = 'text-ink' }) {
  return (
    <div className="relative rounded-xl border border-line bg-card p-4 text-center">
      {info && (
        <span className="group absolute right-2 top-2">
          <button
            type="button"
            aria-label={`Explication : ${label}`}
            className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-line text-xs text-faint transition hover:text-ink focus:text-ink"
          >
            ?
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-7 z-10 w-60 rounded-lg border border-line bg-night p-3 text-left text-xs font-normal leading-relaxed text-mut opacity-0 shadow-2xl transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          >
            {info}
          </span>
        </span>
      )}
      <div className={`font-display text-3xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-mut">
        {label}
      </div>
      {hint && <div className="mt-1 text-xs leading-snug text-faint">{hint}</div>}
    </div>
  )
}
