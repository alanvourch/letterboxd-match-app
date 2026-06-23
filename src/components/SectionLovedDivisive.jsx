import { filmTitle, ratingText } from '../lib/format.js'

const LB_BASE = 'https://letterboxd.com'
const filmUrl = (f) => (!f.uri ? null : f.uri.startsWith('http') ? f.uri : LB_BASE + f.uri)

function FilmLink({ film }) {
  const url = filmUrl(film)
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">
      {filmTitle(film)}
    </a>
  ) : (
    <span>{filmTitle(film)}</span>
  )
}

function DualRating({ a, b, nameA, nameB }) {
  return (
    <span className="shrink-0 text-sm tabular-nums">
      <span className="text-lb-green" title={nameA}>
        {ratingText(a)}
      </span>
      <span className="text-lb-muted"> · </span>
      <span className="text-lb-blue" title={nameB}>
        {ratingText(b)}
      </span>
    </span>
  )
}

export default function SectionLovedDivisive({ loved, divisive, nameA, nameB }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel
        title="❤️ Adorés en commun"
        subtitle="Films notés 4.5★+ ou likés par vous deux"
        empty="Aucun coup de cœur partagé… pour l'instant."
        items={loved}
        render={(f) => (
          <li key={f.uri} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/5">
            <span className="min-w-0 flex-1 truncate">
              <FilmLink film={f} />
              {f.likedBoth && <span className="ml-1.5 text-xs text-lb-orange">♥ likés</span>}
            </span>
            <DualRating a={f.ratingA} b={f.ratingB} nameA={nameA} nameB={nameB} />
          </li>
        )}
      />

      <Panel
        title="⚡ Films clivants"
        subtitle={`Vos plus gros désaccords (+/− = écart de ${nameA})`}
        empty="Vous êtes étonnamment d'accord sur tout."
        items={divisive}
        render={(f) => {
          const signed = f.ratingA - f.ratingB // > 0 : nameA a mis plus haut
          return (
            <li key={f.uri} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/5">
              <span className="min-w-0 flex-1 truncate">
                <FilmLink film={f} />
              </span>
              <DualRating a={f.ratingA} b={f.ratingB} nameA={nameA} nameB={nameB} />
              <span
                className={`w-10 shrink-0 text-right text-xs font-semibold ${
                  signed > 0 ? 'text-lb-green' : 'text-lb-blue'
                }`}
                title={`${nameA} note ${signed > 0 ? 'plus haut' : 'plus bas'} de ${Math.abs(signed).toFixed(1)}★`}
              >
                {signed > 0 ? '+' : '−'}
                {Math.abs(signed).toFixed(1)}
              </span>
            </li>
          )
        }}
      />
    </div>
  )
}

function Panel({ title, subtitle, items, render, empty }) {
  return (
    <section className="rounded-xl border border-lb-border bg-lb-card/70 p-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mb-3 text-xs text-lb-muted">{subtitle}</p>
      {items.length ? (
        <ol className="space-y-1">{items.slice(0, 10).map(render)}</ol>
      ) : (
        <p className="text-sm italic text-lb-muted">{empty}</p>
      )}
    </section>
  )
}
