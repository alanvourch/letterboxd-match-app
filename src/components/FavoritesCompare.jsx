import { filmTitle } from '../lib/format.js'
import { filmKey } from '../lib/filmKey.js'

const LB_BASE = 'https://letterboxd.com'
const filmUrl = (f) => (!f.uri ? null : f.uri.startsWith('http') ? f.uri : LB_BASE + f.uri)

function FavCard({ film, shared }) {
  const url = filmUrl(film)
  const inner = (
    <div
      className={`overflow-hidden rounded-lg border text-sm transition ${
        shared
          ? 'border-lb-orange/70 ring-1 ring-lb-orange/40'
          : 'border-lb-border'
      }`}
    >
      {film.posterUrl ? (
        <img
          src={film.posterUrl}
          alt={filmTitle(film)}
          className="aspect-[2/3] w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-[2/3] w-full items-center justify-center bg-black/30 p-2 text-center text-xs text-lb-text">
          {filmTitle(film)}
        </div>
      )}
      <div className="flex items-center justify-between gap-1 bg-lb-card px-2 py-1 text-xs">
        <span className="truncate">{film.name}</span>
        {shared && <span className="shrink-0 text-lb-orange" title="Favori commun">★</span>}
      </div>
    </div>
  )
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block hover:opacity-80"
      title={filmTitle(film)}
    >
      {inner}
    </a>
  ) : (
    inner
  )
}

export default function FavoritesCompare({ favorites, nameA, nameB }) {
  // Détection par nom+année (les URIs diffèrent selon la source).
  const sharedKeys = new Set(favorites.shared.map((f) => filmKey(f.name, f.year)))
  const isShared = (f) => sharedKeys.has(filmKey(f.name, f.year))
  const hasAny = favorites.a.length || favorites.b.length

  return (
    <section className="rounded-xl border border-lb-border bg-lb-card/70 p-4">
      <h3 className="text-lg font-bold text-white">🎬 Favoris officiels</h3>
      <p className="mb-3 text-xs text-lb-muted">
        Les 4 films épinglés sur chaque profil.
        {favorites.shared.length > 0 && (
          <span className="text-lb-orange">
            {' '}
            {favorites.shared.length} favori
            {favorites.shared.length > 1 ? 's' : ''} en commun !
          </span>
        )}
      </p>

      {!hasAny ? (
        <p className="text-sm italic text-lb-muted">
          Aucun favori trouvé (le fichier profile.csv était absent des exports).
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-lb-green/30 bg-lb-green/5 p-3">
            <h4 className="mb-2 text-sm font-semibold text-lb-green">{nameA}</h4>
            <div className="grid grid-cols-4 gap-2">
              {favorites.a.map((f, i) => (
                <FavCard key={f.uri || i} film={f} shared={isShared(f)} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-lb-blue/30 bg-lb-blue/5 p-3">
            <h4 className="mb-2 text-sm font-semibold text-lb-blue">{nameB}</h4>
            <div className="grid grid-cols-4 gap-2">
              {favorites.b.map((f, i) => (
                <FavCard key={f.uri || i} film={f} shared={isShared(f)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
