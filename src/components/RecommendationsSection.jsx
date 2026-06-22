import FilmList, { Rating } from './FilmList.jsx'

// Pépites d'un user (bien notées / likées) que l'autre n'a pas encore vues.
// Une colonne par sens, pour se faire découvrir des films mutuellement.
function meta(film) {
  return (
    <span className="flex items-center gap-1.5">
      {film.liked && <span className="text-lb-orange" title="Liké">♥</span>}
      <Rating value={film.rating} />
    </span>
  )
}

export default function RecommendationsSection({ recommendations, nameA, nameB }) {
  const { aToB, bToA } = recommendations
  if (!aToB.length && !bToA.length) return null

  return (
    <section className="rounded-xl border border-lb-border bg-lb-card/70 p-4">
      <h3 className="text-lg font-bold text-white">🍿 À se faire découvrir</h3>
      <p className="mb-3 text-xs text-lb-muted">
        Coups de cœur de l'un que l'autre n'a pas encore vus.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 border-b border-lb-border pb-1 text-sm font-semibold text-lb-text">
            <span className="text-lb-green">{nameA}</span> → fait découvrir à{' '}
            <span className="text-lb-blue">{nameB}</span>
          </h4>
          <FilmList
            rows={aToB}
            renderMeta={meta}
            emptyText={`${nameB} a déjà vu toutes les pépites de ${nameA} !`}
          />
        </div>
        <div>
          <h4 className="mb-2 border-b border-lb-border pb-1 text-sm font-semibold text-lb-text">
            <span className="text-lb-blue">{nameB}</span> → fait découvrir à{' '}
            <span className="text-lb-green">{nameA}</span>
          </h4>
          <FilmList
            rows={bToA}
            renderMeta={meta}
            emptyText={`${nameA} a déjà vu toutes les pépites de ${nameB} !`}
          />
        </div>
      </div>
    </section>
  )
}
