// Carte métrique : eyebrow, grand chiffre, détail. L'infobulle "?" est un
// vrai bouton focusable (accessible au clavier), affichée au survol/focus.
// L'infobulle est ancrée à la CARTE (inset-x) et non au bouton : elle ne peut
// jamais déborder de l'écran, même sur mobile.
export default function StatCard({ value, label, hint, info, tone = 'text-ink' }) {
  return (
    <div className="relative rounded-xl border border-line bg-card p-4 text-center">
      {info && (
        <>
          <button
            type="button"
            aria-label={`Explication : ${label}`}
            className="peer absolute right-2 top-2 flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-line text-xs text-faint transition hover:text-ink focus:text-ink"
          >
            ?
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute inset-x-1 top-9 z-10 rounded-lg border border-line bg-night p-3 text-left text-xs font-normal leading-relaxed text-mut opacity-0 shadow-2xl transition-opacity duration-150 peer-hover:opacity-100 peer-focus:opacity-100"
          >
            {info}
          </span>
        </>
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
