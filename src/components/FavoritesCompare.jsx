import Section from './Section.jsx'
import FilmStrip from './FilmStrip.jsx'
import { filmKey } from '../lib/filmKey.js'

// Les 4 films épinglés de chaque profil, côte à côte. Détection des favoris
// communs par nom+année (les URIs diffèrent selon la source).
export default function FavoritesCompare({ favorites, nameA, nameB, enrichMap }) {
  const sharedKeys = new Set(favorites.shared.map((f) => filmKey(f.name, f.year)))
  const isShared = (f) => sharedKeys.has(filmKey(f.name, f.year))
  const hasAny = favorites.a.length || favorites.b.length

  return (
    <Section
      eyebrow="Le panthéon de chacun"
      title="Favoris officiels"
      subtitle={
        favorites.shared.length > 0 ? (
          <>
            Les 4 films épinglés sur chaque profil —{' '}
            <span className="font-semibold text-orange">
              {favorites.shared.length} favori{favorites.shared.length > 1 ? 's' : ''} en
              commun !
            </span>
          </>
        ) : (
          'Les 4 films épinglés sur chaque profil Letterboxd.'
        )
      }
    >
      {!hasAny ? (
        <p className="text-sm italic text-faint">
          Aucun favori trouvé (profil sans favoris, ou export sans profile.csv).
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-green/25 bg-green/5 p-3">
            <h4 className="mb-2 text-sm font-semibold text-green">{nameA}</h4>
            <FilmStrip films={favorites.a} enrichMap={enrichMap} highlight={isShared} cols="grid-cols-4" />
          </div>
          <div className="rounded-lg border border-blue/25 bg-blue/5 p-3">
            <h4 className="mb-2 text-sm font-semibold text-blue">{nameB}</h4>
            <FilmStrip films={favorites.b} enrichMap={enrichMap} highlight={isShared} cols="grid-cols-4" />
          </div>
        </div>
      )}
    </Section>
  )
}
