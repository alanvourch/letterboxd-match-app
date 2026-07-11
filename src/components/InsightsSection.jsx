import Section from './Section.jsx'
import { ratingText } from '../lib/format.js'
import { posterUrl } from '../lib/enrich.js'
import { GENRE_EMOJI } from '../lib/tmdbGenres.js'

// "Votre ADN ciné" : genres racontés en grandes tuiles emoji (fini le
// graphique à barres) + réalisateurs et acteurs en commun AVEC photos.
// Rendu uniquement si l'enrichissement TMDB a abouti.

function GenreTile({ emoji, eyebrow, name, detail, accent = 'border-line' }) {
  return (
    <div className={`rounded-xl border bg-well p-4 ${accent}`}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-faint">
        {eyebrow}
      </p>
      <p className="mt-2 flex items-center gap-2.5">
        <span aria-hidden="true" className="text-3xl leading-none">
          {emoji}
        </span>
        <span className="font-display text-xl font-semibold text-ink">{name}</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-mut">{detail}</p>
    </div>
  )
}

// Rangée de visages : photo ronde, nom, films vus à deux + note moyenne.
function PeopleRow({ people }) {
  return (
    <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6">
      {people.map((p) => (
        <li key={p.name} className="text-center">
          {p.profilePath ? (
            <img
              src={posterUrl(p.profilePath, 'w185')}
              alt={p.name}
              loading="lazy"
              className="mx-auto h-16 w-16 rounded-full border border-line object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <span
              aria-hidden="true"
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-line bg-well font-display text-xl italic text-mut sm:h-20 sm:w-20"
            >
              {p.name.charAt(0)}
            </span>
          )}
          <p
            className="mt-2 truncate text-xs font-semibold text-ink"
            title={`${p.name} — ${p.films.join(', ')}`}
          >
            {p.name}
          </p>
          <p className="text-[0.7rem] tabular-nums text-mut">
            {p.n} films
            {p.mean != null && (
              <>
                {' · '}
                {ratingText(p.mean)}
                <span className="text-orange">★</span>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}

export default function InsightsSection({
  genres,
  directors,
  actors,
  nameA,
  nameB,
  pending,
}) {
  if (pending) {
    return (
      <Section
        eyebrow="Votre ADN ciné"
        title="Genres, réalisateurs & acteurs"
        subtitle="Analyse de vos films en commun…"
      >
        <div className="flex items-center gap-3 py-6 text-sm text-mut">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-orange" />
          On regarde ce que vos films en commun racontent de vous deux…
        </div>
      </Section>
    )
  }

  const hasPeople = directors?.length > 0 || actors?.length > 0
  if (!genres && !hasPeople) return null

  const tiles = []
  if (genres?.signature && genres.signature.coLoved > 0) {
    tiles.push({
      emoji: GENRE_EMOJI[genres.signature.id] || '🎬',
      eyebrow: 'Votre genre signature',
      name: genres.signature.name,
      detail: `${genres.signature.coLoved} films de ce genre adorés par vous deux — c'est votre terrain de jeu.`,
      accent: 'border-orange/40',
    })
  }
  if (genres?.accord) {
    tiles.push({
      emoji: GENRE_EMOJI[genres.accord.id] || '🤝',
      eyebrow: "Terrain d'entente",
      name: genres.accord.name,
      detail: `Vous lui donnez quasiment la même note (${ratingText(
        (genres.accord.meanA + genres.accord.meanB) / 2,
      )}★ en moyenne) sur ${genres.accord.ratedN} films.`,
    })
  }
  if (genres?.clash) {
    tiles.push({
      emoji: GENRE_EMOJI[genres.clash.id] || '⚡',
      eyebrow: 'Le genre qui fâche',
      name: genres.clash.name,
      detail: `${genres.clash.meanA > genres.clash.meanB ? nameA : nameB} le note ${Math.abs(
        genres.clash.meanA - genres.clash.meanB,
      ).toFixed(1)}★ plus haut que l'autre, en moyenne.`,
    })
  }

  return (
    <Section
      eyebrow="Votre ADN ciné"
      title="Genres, réalisateurs & acteurs"
      subtitle="Ce que vos films vus en commun racontent de vous deux."
    >
      {tiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <GenreTile key={t.eyebrow} {...t} />
          ))}
        </div>
      )}

      {directors?.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-4 border-b border-line pb-1.5 text-sm font-semibold text-ink">
            Vos réalisateurs en commun
          </h4>
          <PeopleRow people={directors} />
        </div>
      )}

      {actors?.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-4 border-b border-line pb-1.5 text-sm font-semibold text-ink">
            Les acteurs qui reviennent chez vous deux
          </h4>
          <PeopleRow people={actors} />
        </div>
      )}
    </Section>
  )
}
