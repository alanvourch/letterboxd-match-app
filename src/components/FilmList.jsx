import { filmTitle, ratingText } from '../lib/format.js'

const LB_BASE = 'https://letterboxd.com'

function filmUrl(film) {
  if (!film.uri) return null
  return film.uri.startsWith('http') ? film.uri : LB_BASE + film.uri
}

// Liste de films réutilisable (top / flop / communs / clivants).
// `rows` : tableau d'objets film. `renderMeta` : fonction optionnelle qui
// renvoie le contenu à droite de chaque ligne (note, double note, etc.).
export default function FilmList({ rows, renderMeta, emptyText = 'Rien à afficher.' }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-lb-muted italic">{emptyText}</p>
  }

  return (
    <ol className="space-y-1">
      {rows.map((film, i) => {
        const url = filmUrl(film)
        return (
          <li
            key={film.uri || film.name + i}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/5"
          >
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-lb-muted">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white hover:underline"
                >
                  {filmTitle(film)}
                </a>
              ) : (
                filmTitle(film)
              )}
            </span>
            <span className="shrink-0 text-sm">
              {renderMeta ? renderMeta(film) : <Rating value={film.rating} />}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function Rating({ value }) {
  if (value == null) return <span className="text-lb-muted">—</span>
  return (
    <span className="text-lb-green tabular-nums">
      {ratingText(value)}
      <span className="text-lb-green/60"> ★</span>
    </span>
  )
}

// Meta réutilisable : cœur si liké + note. Pour les listes de coups de cœur.
export function ratingMeta(film) {
  return (
    <span className="flex items-center gap-1.5">
      {film.liked && (
        <span className="text-lb-orange" title="Liké">
          ♥
        </span>
      )}
      <Rating value={film.rating} />
    </span>
  )
}
