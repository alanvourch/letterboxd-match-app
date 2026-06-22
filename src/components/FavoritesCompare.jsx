import { filmTitle } from '../lib/format.js'

const LB_BASE = 'https://letterboxd.com'
const filmUrl = (f) => (!f.uri ? null : f.uri.startsWith('http') ? f.uri : LB_BASE + f.uri)

function FavCard({ film, shared }) {
  const url = filmUrl(film)
  const inner = (
    <div
      className={`rounded-lg border p-3 text-sm ${
        shared
          ? 'border-lb-orange/60 bg-lb-orange/10 text-white'
          : 'border-lb-border bg-black/20'
      }`}
    >
      {filmTitle(film)}
      {shared && <span className="ml-1 text-lb-orange">★</span>}
    </div>
  )
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="block hover:opacity-80">
      {inner}
    </a>
  ) : (
    inner
  )
}

export default function FavoritesCompare({ favorites, nameA, nameB }) {
  const sharedUris = new Set(favorites.shared.map((f) => f.uri))
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
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-lb-green">{nameA}</h4>
            <div className="grid grid-cols-2 gap-2">
              {favorites.a.map((f, i) => (
                <FavCard key={f.uri || i} film={f} shared={sharedUris.has(f.uri)} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-lb-blue">{nameB}</h4>
            <div className="grid grid-cols-2 gap-2">
              {favorites.b.map((f, i) => (
                <FavCard key={f.uri || i} film={f} shared={sharedUris.has(f.uri)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
