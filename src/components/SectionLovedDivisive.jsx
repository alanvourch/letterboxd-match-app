import Section from './Section.jsx'
import FilmStrip from './FilmStrip.jsx'
import FilmList from './FilmList.jsx'
import { ratingText } from '../lib/format.js'

function DualRating({ a, b, nameA, nameB }) {
  return (
    <span className="shrink-0 text-sm tabular-nums">
      <span className="text-green" title={`Note de ${nameA}`}>
        {ratingText(a)}
      </span>
      <span className="text-faint"> · </span>
      <span className="text-blue" title={`Note de ${nameB}`}>
        {ratingText(b)}
      </span>
    </span>
  )
}

// Adorés en commun (bande d'affiches) + films clivants (liste à double note).
export default function SectionLovedDivisive({ loved, divisive, nameA, nameB, enrichMap }) {
  return (
    <>
      <Section
        eyebrow="Vos deux cœurs battent ici"
        title="Adorés en commun"
        subtitle="Notés 4.5★+ ou likés par vous deux."
      >
        {loved.length ? (
          <FilmStrip
            films={loved.slice(0, 12)}
            enrichMap={enrichMap}
            renderCaption={(f) =>
              f.likedBoth && f.ratingA == null && f.ratingB == null ? (
                <span className="text-orange">♥ likés tous les deux</span>
              ) : (
                <>
                  <span className="text-green">{ratingText(f.ratingA)}</span>
                  {' · '}
                  <span className="text-blue">{ratingText(f.ratingB)}</span>
                  {f.likedBoth && <span className="text-orange"> ♥</span>}
                </>
              )
            }
          />
        ) : (
          <p className="text-sm italic text-faint">
            Aucun coup de cœur partagé… pour l'instant.
          </p>
        )}
      </Section>

      <Section
        eyebrow="Là où ça se complique"
        title="Films clivants"
        subtitle={`Vos plus gros désaccords de notes (± = écart vu du côté de ${nameA}).`}
      >
        {divisive.length ? (
          <div className="mx-auto max-w-2xl">
            <FilmList
              rows={divisive.slice(0, 10)}
              enrichMap={enrichMap}
              renderMeta={(f) => {
                const signed = f.ratingA - f.ratingB
                return (
                  <span className="flex items-center gap-2">
                    <DualRating a={f.ratingA} b={f.ratingB} nameA={nameA} nameB={nameB} />
                    <span
                      className={`w-10 text-right text-xs font-semibold tabular-nums ${
                        signed > 0 ? 'text-green' : 'text-blue'
                      }`}
                      title={`${nameA} note ${signed > 0 ? 'plus haut' : 'plus bas'} de ${Math.abs(signed).toFixed(1)}★`}
                    >
                      {signed > 0 ? '+' : '−'}
                      {Math.abs(signed).toFixed(1)}
                    </span>
                  </span>
                )
              }}
              emptyText="Vous êtes étonnamment d'accord sur tout."
            />
          </div>
        ) : (
          <p className="text-sm italic text-faint">
            Vous êtes étonnamment d'accord sur tout.
          </p>
        )}
      </Section>
    </>
  )
}
