import Section from './Section.jsx'
import FilmStrip from './FilmStrip.jsx'
import { ratingText } from '../lib/format.js'

// Pépites d'un profil (bien notées / likées) que l'autre n'a pas encore vues,
// en affiches : c'est le programme de la prochaine soirée ciné.
const caption = (f) => (
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

export default function RecommendationsSection({ recommendations, nameA, nameB, enrichMap }) {
  const { aToB, bToA } = recommendations
  if (!aToB.length && !bToA.length) return null

  const block = (films, from, to, fromTone, toTone, emptyName) => (
    <div>
      <h4 className="mb-3 border-b border-line pb-1.5 text-sm font-semibold text-mut">
        <span className={fromTone}>{from}</span> fait découvrir à{' '}
        <span className={toTone}>{to}</span>
      </h4>
      {films.length ? (
        <FilmStrip
          films={films}
          enrichMap={enrichMap}
          renderCaption={caption}
          cols="grid-cols-3 sm:grid-cols-6"
        />
      ) : (
        <p className="text-sm italic text-faint">
          {to} a déjà vu toutes les pépites de {emptyName} !
        </p>
      )}
    </div>
  )

  return (
    <Section
      eyebrow="Programme de la prochaine séance"
      title="À se faire découvrir"
      subtitle="Coups de cœur de l'un que l'autre n'a pas encore vus."
    >
      <div className="space-y-6">
        {block(aToB, nameA, nameB, 'text-green', 'text-blue', nameA)}
        {block(bToA, nameB, nameA, 'text-blue', 'text-green', nameB)}
      </div>
    </Section>
  )
}
