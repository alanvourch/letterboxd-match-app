import Section from './Section.jsx'
import FilmList, { Rating } from './FilmList.jsx'

// Pépites d'un user (bien notées / likées) que l'autre n'a pas encore vues.
function meta(film) {
  return (
    <span className="flex items-center gap-1.5">
      {film.liked && (
        <span className="text-orange" title="Liké">
          ♥
        </span>
      )}
      <Rating value={film.rating} />
    </span>
  )
}

export default function RecommendationsSection({ recommendations, nameA, nameB, enrichMap }) {
  const { aToB, bToA } = recommendations
  if (!aToB.length && !bToA.length) return null

  return (
    <Section
      eyebrow="Programme de la prochaine séance"
      title="À se faire découvrir"
      subtitle="Coups de cœur de l'un que l'autre n'a pas encore vus."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 border-b border-line pb-1.5 text-sm font-semibold text-mut">
            <span className="text-green">{nameA}</span> → conseille à{' '}
            <span className="text-blue">{nameB}</span>
          </h4>
          <FilmList
            rows={aToB}
            enrichMap={enrichMap}
            renderMeta={meta}
            emptyText={`${nameB} a déjà vu toutes les pépites de ${nameA} !`}
          />
        </div>
        <div>
          <h4 className="mb-2 border-b border-line pb-1.5 text-sm font-semibold text-mut">
            <span className="text-blue">{nameB}</span> → conseille à{' '}
            <span className="text-green">{nameA}</span>
          </h4>
          <FilmList
            rows={bToA}
            enrichMap={enrichMap}
            renderMeta={meta}
            emptyText={`${nameA} a déjà vu toutes les pépites de ${nameB} !`}
          />
        </div>
      </div>
    </Section>
  )
}
