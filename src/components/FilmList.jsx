import { filmTitle, ratingText } from '../lib/format.js'
import { filmKey } from '../lib/filmKey.js'
import { posterUrl } from '../lib/enrich.js'

const LB_BASE = 'https://letterboxd.com'

function filmUrl(film) {
  if (!film.uri) return null
  return film.uri.startsWith('http') ? film.uri : LB_BASE + film.uri
}

// Vignette d'affiche (enrichissement TMDB) ; placeholder pellicule sinon.
function Thumb({ film, enrichMap }) {
  const info = enrichMap?.get(filmKey(film.name, film.year))
  const src = posterUrl(info?.posterPath, 'w92')
  if (!enrichMap) return null // pas d'enrichissement : liste compacte sans vignettes
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="h-12 w-8 shrink-0 rounded-[3px] border border-line object-cover"
    />
  ) : (
    <span aria-hidden="true" className="h-12 w-8 shrink-0 rounded-[3px] border border-line bg-well" />
  )
}

// Liste de films réutilisable (top / flop / communs / clivants).
// `renderMeta` : contenu à droite de chaque ligne (note, double note…).
// `enrichMap` : Map filmKey -> infos TMDB (affiche les vignettes si présent).
export default function FilmList({ rows, renderMeta, enrichMap, emptyText = 'Rien à afficher.' }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm italic text-faint">{emptyText}</p>
  }

  return (
    <ol className="space-y-1">
      {rows.map((film, i) => {
        const url = filmUrl(film)
        return (
          <li
            key={film.uri || film.name + i}
            className="flex items-center gap-3 rounded-md px-2 py-1 transition hover:bg-ink/5"
          >
            <span className="w-5 shrink-0 text-right font-display text-sm italic tabular-nums text-faint">
              {i + 1}
            </span>
            <Thumb film={film} enrichMap={enrichMap} />
            <span className="min-w-0 flex-1 truncate text-sm">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-ink hover:underline"
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
  if (value == null) return <span className="text-faint">-</span>
  return (
    <span className="tabular-nums text-ink">
      {ratingText(value)}
      <span className="text-orange"> ★</span>
    </span>
  )
}

