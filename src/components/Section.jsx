// En-tête de section éditorial : eyebrow en petites capitales + titre serif.
export default function Section({ eyebrow, title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-line bg-card p-5 ${className}`}>
      {eyebrow && (
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-orange">
          {eyebrow}
        </p>
      )}
      <h3 className="mt-0.5 font-display text-xl font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-mut">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
