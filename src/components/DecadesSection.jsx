import Section from './Section.jsx'
import { decadeLabel, ratingText, pct } from '../lib/format.js'

// Histogramme des décennies : colonnes appariées (A vert / B bleu), hauteur =
// part des films vus. Étiquette directe uniquement sur le sommet de chaque
// série (labels sélectifs) ; le reste est lisible au survol (title).
export default function DecadesSection({ decades, nameA, nameB }) {
  const { a, b, bestTogether } = decades

  const shares = new Map() // decade -> { a, b }
  for (const e of a) shares.set(e.decade, { a: e.share, b: 0 })
  for (const e of b) {
    const cur = shares.get(e.decade) || { a: 0, b: 0 }
    cur.b = e.share
    shares.set(e.decade, cur)
  }
  const rows = [...shares.entries()]
    .map(([decade, s]) => ({ decade, ...s }))
    .sort((x, y) => x.decade - y.decade)
  // Regroupe la traîne ancienne pour garder un axe lisible sur mobile.
  const MAX_COLS = 9
  const trimmed = rows.length > MAX_COLS ? rows.slice(rows.length - MAX_COLS) : rows

  if (!trimmed.length) return null

  const maxShare = Math.max(...trimmed.flatMap((r) => [r.a, r.b]), 0.01)
  const topA = trimmed.reduce((m, r) => (r.a > m.a ? r : m), trimmed[0])
  const topB = trimmed.reduce((m, r) => (r.b > m.b ? r : m), trimmed[0])

  return (
    <Section
      eyebrow="Chronologie"
      title="Vos décennies"
      subtitle="Répartition des films vus par décennie de sortie."
    >
      <div className="mb-3 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5 text-xs text-mut">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-greenfill" />
          {nameA}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-mut">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-bluefill" />
          {nameB}
        </span>
      </div>

      <div className="flex items-end gap-1.5 sm:gap-3" role="img" aria-label={`Répartition par décennie : ${nameA} surtout ${decadeLabel(topA.decade)}, ${nameB} surtout ${decadeLabel(topB.decade)}`}>
        {trimmed.map((r) => (
          <div key={r.decade} className="flex-1">
            <div
              className="flex h-28 items-end justify-center gap-[2px]"
              title={`${decadeLabel(r.decade)} — ${nameA} : ${pct(r.a)} · ${nameB} : ${pct(r.b)}`}
            >
              <div className="relative w-full max-w-[18px]">
                {r.decade === topA.decade && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[0.65rem] tabular-nums text-mut">
                    {pct(r.a)}
                  </span>
                )}
                <div
                  className="w-full rounded-t-[4px] bg-greenfill"
                  style={{ height: `${Math.max((r.a / maxShare) * 96, r.a > 0 ? 3 : 0)}px` }}
                />
              </div>
              <div className="relative w-full max-w-[18px]">
                {r.decade === topB.decade && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[0.65rem] tabular-nums text-mut">
                    {pct(r.b)}
                  </span>
                )}
                <div
                  className="w-full rounded-t-[4px] bg-bluefill"
                  style={{ height: `${Math.max((r.b / maxShare) * 96, r.b > 0 ? 3 : 0)}px` }}
                />
              </div>
            </div>
            <p className="mt-1.5 border-t border-line pt-1 text-center text-[0.65rem] tabular-nums text-faint">
              {r.decade < 2000 ? `'${String(r.decade).slice(2)}` : r.decade}
            </p>
          </div>
        ))}
      </div>

      {bestTogether && (
        <p className="mt-4 rounded-lg border border-line bg-well px-4 py-3 text-sm text-mut">
          Votre meilleure décennie à deux :{' '}
          <span className="font-display italic text-ink">
            les {decadeLabel(bestTogether.decade)}
          </span>{' '}
          — {bestTogether.count} films co-notés à{' '}
          <span className="tabular-nums text-ink">{ratingText(bestTogether.mean)}</span>
          <span className="text-orange">★</span> de moyenne.
        </p>
      )}
    </Section>
  )
}
