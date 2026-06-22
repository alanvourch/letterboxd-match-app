import FilmList from './FilmList.jsx'

// Affiche le top OU le flop des deux users côte à côte.
export default function TopFlopCompare({ title, subtitle, a, b, nameA, nameB }) {
  return (
    <section className="rounded-xl border border-lb-border bg-lb-card/70 p-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-lb-muted">{subtitle}</p>}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 border-b border-lb-border pb-1 text-sm font-semibold text-lb-green">
            {nameA}
          </h4>
          <FilmList rows={a} emptyText="Aucune note." />
        </div>
        <div>
          <h4 className="mb-2 border-b border-lb-border pb-1 text-sm font-semibold text-lb-blue">
            {nameB}
          </h4>
          <FilmList rows={b} emptyText="Aucune note." />
        </div>
      </div>
    </section>
  )
}
