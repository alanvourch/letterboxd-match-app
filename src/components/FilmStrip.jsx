import { filmTitle } from '../lib/format.js'
import { filmKey } from '../lib/filmKey.js'
import { posterUrl } from '../lib/enrich.js'

const LB_BASE = 'https://letterboxd.com'
const filmUrl = (f) => (!f.uri ? null : f.uri.startsWith('http') ? f.uri : LB_BASE + f.uri)

// Bande d'affiches horizontale (adorés en commun, favoris…).
// `renderCaption` : contenu optionnel sous le titre (notes, badge…).
export default function FilmStrip({
  films,
  enrichMap,
  renderCaption,
  highlight,
  cols = 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6',
}) {
  if (!films?.length) return null

  return (
    <ul className={`grid gap-3 ${cols}`}>
      {films.map((film, i) => {
        const info = enrichMap?.get(filmKey(film.name, film.year))
        const src = film.posterUrl || posterUrl(info?.posterPath, 'w342')
        const url = filmUrl(film)
        const highlighted = highlight?.(film)

        const card = (
          <figure>
            <div
              className={`overflow-hidden rounded-md border ${
                highlighted ? 'border-orange/70 ring-1 ring-orange/50' : 'border-line'
              }`}
            >
              {src ? (
                <img
                  src={src}
                  alt={`Affiche de ${filmTitle(film)}`}
                  loading="lazy"
                  className="aspect-[2/3] w-full object-cover transition group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center bg-well p-2 text-center">
                  <span className="font-display text-xs italic leading-snug text-mut">
                    {filmTitle(film)}
                  </span>
                </div>
              )}
            </div>
            <figcaption className="mt-1.5">
              <span className="block truncate text-xs font-medium text-ink" title={filmTitle(film)}>
                {film.name}
                {highlighted && (
                  <span className="ml-1 text-orange" title="En commun">
                    ★
                  </span>
                )}
              </span>
              {renderCaption && (
                <span className="block truncate text-xs text-mut">{renderCaption(film)}</span>
              )}
            </figcaption>
          </figure>
        )

        return (
          <li key={film.uri || film.name + i}>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="group block">
                {card}
              </a>
            ) : (
              card
            )}
          </li>
        )
      })}
    </ul>
  )
}
