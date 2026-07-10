import Section from './Section.jsx'
import { ratingText } from '../lib/format.js'

// Insights TMDB : accord par genre (barres appariées A/B) + réalisateurs en
// commun + genre signature. Rendu uniquement si l'enrichissement a abouti.
//
// Couleurs des barres : variantes assombries validées (contraste, daltonisme)
// -> greenfill / bluefill ; le texte reste en tokens ink/mut, jamais coloré.

function LegendChip({ colorClass, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-mut">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[2px] ${colorClass}`} />
      {label}
    </span>
  )
}

function GenreBars({ rows, nameA, nameB }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4">
        <LegendChip colorClass="bg-greenfill" label={nameA} />
        <LegendChip colorClass="bg-bluefill" label={nameB} />
      </div>
      <ul className="space-y-3">
        {rows
          .filter((g) => g.meanA != null)
          .slice(0, 6)
          .map((g) => (
            <li key={g.id}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-medium text-ink">{g.name}</span>
                <span className="text-xs tabular-nums text-faint">
                  {g.ratedN} films co-notés
                </span>
              </div>
              <div
                className="space-y-0.5"
                title={`${g.name} — ${nameA} : ${ratingText(g.meanA)}★ · ${nameB} : ${ratingText(g.meanB)}★`}
              >
                {[
                  { mean: g.meanA, fill: 'bg-greenfill', who: nameA },
                  { mean: g.meanB, fill: 'bg-bluefill', who: nameB },
                ].map(({ mean, fill, who }) => (
                  <div key={who} className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-r-[4px] bg-well">
                      <div
                        className={`h-full rounded-r-[4px] ${fill}`}
                        style={{ width: `${(mean / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-mut">
                      {ratingText(mean)}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
      </ul>
      <p className="mt-3 text-xs text-faint">
        Note moyenne de chacun par genre, sur les films notés par les deux (échelle 0–5).
      </p>
    </div>
  )
}

function HighlightTile({ eyebrow, big, detail }) {
  return (
    <div className="rounded-lg border border-line bg-well p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-faint">
        {eyebrow}
      </p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">{big}</p>
      <p className="mt-1 text-xs leading-relaxed text-mut">{detail}</p>
    </div>
  )
}

function Directors({ directors }) {
  return (
    <ul className="divide-y divide-line">
      {directors.map((d) => (
        <li key={d.name} className="flex items-baseline justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-ink">
              {d.name}
            </p>
            <p className="truncate text-xs text-faint" title={d.films.join(', ')}>
              {d.films.join(' · ')}
            </p>
          </div>
          <p className="shrink-0 text-right text-xs text-mut">
            <span className="tabular-nums text-ink">{d.n}</span> films vus à deux
            {d.mean != null && (
              <span className="block tabular-nums">
                notés {ratingText(d.mean)}
                <span className="text-orange">★</span> en moyenne
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}

export default function InsightsSection({ genres, directors, nameA, nameB, pending }) {
  if (pending) {
    return (
      <Section
        eyebrow="Enrichissement TMDB"
        title="Genres & réalisateurs"
        subtitle="Analyse des films en commun via la base TMDB…"
      >
        <div className="flex items-center gap-3 py-6 text-sm text-mut">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-orange" />
          Recherche des genres et réalisateurs de vos films communs…
        </div>
      </Section>
    )
  }

  if (!genres && !directors?.length) return null

  const tiles = []
  if (genres?.signature && genres.signature.coLoved > 0) {
    tiles.push({
      eyebrow: 'Genre signature',
      big: genres.signature.name,
      detail: `${genres.signature.coLoved} films de ce genre adorés par vous deux — c'est votre terrain de jeu.`,
    })
  }
  if (genres?.accord) {
    tiles.push({
      eyebrow: "Terrain d'entente",
      big: genres.accord.name,
      detail: `Vos moyennes n'y diffèrent que de ${Math.abs(
        genres.accord.meanA - genres.accord.meanB,
      ).toFixed(1)}★ sur ${genres.accord.ratedN} films co-notés.`,
    })
  }
  if (genres?.clash) {
    tiles.push({
      eyebrow: 'Le genre qui fâche',
      big: genres.clash.name,
      detail: `${genres.clash.meanA > genres.clash.meanB ? nameA : nameB} le note ${Math.abs(
        genres.clash.meanA - genres.clash.meanB,
      ).toFixed(1)}★ plus haut que l'autre, en moyenne.`,
    })
  }

  return (
    <Section
      eyebrow="Enrichi via TMDB"
      title="Genres & réalisateurs"
      subtitle="Calculé sur vos films vus en commun."
    >
      {tiles.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <HighlightTile key={t.eyebrow} {...t} />
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {genres?.rows?.length > 0 && (
          <div>
            <h4 className="mb-3 border-b border-line pb-1.5 text-sm font-semibold text-ink">
              L'accord par genre
            </h4>
            <GenreBars rows={genres.rows} nameA={nameA} nameB={nameB} />
          </div>
        )}
        {directors?.length > 0 && (
          <div>
            <h4 className="mb-3 border-b border-line pb-1.5 text-sm font-semibold text-ink">
              Vos réalisateurs en commun
            </h4>
            <Directors directors={directors} />
          </div>
        )}
      </div>
    </Section>
  )
}
