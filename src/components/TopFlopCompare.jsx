import Section from './Section.jsx'
import FilmStrip from './FilmStrip.jsx'
import { ratingText } from '../lib/format.js'

// Légende par défaut sous chaque affiche : note + cœur si liké.
const ratingCaption = (f) => (
  <>
    {f.rating != null && (
      <>
        <span className="tabular-nums text-ink">{ratingText(f.rating)}</span>
        <span className="text-orange">★</span>
      </>
    )}
    {f.liked && <span className="text-orange"> ♥</span>}
  </>
)

// Deux rangées d'affiches (une par profil) : coups de cœur récents, flops…
export default function TopFlopCompare({
  eyebrow,
  title,
  subtitle,
  a,
  b,
  nameA,
  nameB,
  enrichMap,
  emptyText = 'Rien à afficher.',
  limit = 6,
}) {
  if (!a.length && !b.length) return null

  const row = (films, name, tone) => (
    <div>
      <h4 className={`mb-3 border-b border-line pb-1.5 text-sm font-semibold ${tone}`}>
        {name}
      </h4>
      {films.length ? (
        <FilmStrip
          films={films.slice(0, limit)}
          enrichMap={enrichMap}
          renderCaption={ratingCaption}
          cols="grid-cols-3 sm:grid-cols-6"
        />
      ) : (
        <p className="text-sm italic text-faint">{emptyText}</p>
      )}
    </div>
  )

  return (
    <Section eyebrow={eyebrow} title={title} subtitle={subtitle}>
      <div className="space-y-6">
        {row(a, nameA, 'text-green')}
        {row(b, nameB, 'text-blue')}
      </div>
    </Section>
  )
}
