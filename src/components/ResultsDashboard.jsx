import { useMemo } from 'react'
import ScoreHero from './ScoreHero.jsx'
import StatCard from './StatCard.jsx'
import ShareActions from './ShareActions.jsx'
import SectionLovedDivisive from './SectionLovedDivisive.jsx'
import InsightsSection from './InsightsSection.jsx'
import DecadesSection from './DecadesSection.jsx'
import RecommendationsSection from './RecommendationsSection.jsx'
import TopFlopCompare from './TopFlopCompare.jsx'
import FavoritesCompare from './FavoritesCompare.jsx'
import { ratingMeta } from './FilmList.jsx'
import { pct, correlationLabel, biasText } from '../lib/format.js'
import { genreInsights, directorInsights } from '../lib/insights.js'

export default function ResultsDashboard({ result, enrichMap, enriching, shareUrl, onReset }) {
  const {
    profiles,
    score,
    label,
    overlap,
    taste,
    lovedInCommon,
    divisive,
    commonFilms,
    decades,
    recommendations,
    recentLoved,
    flop,
    favorites,
  } = result
  const nameA = profiles.a.username
  const nameB = profiles.b.username

  const genres = useMemo(
    () => genreInsights(commonFilms, enrichMap),
    [commonFilms, enrichMap],
  )
  const directors = useMemo(
    () => directorInsights(commonFilms, enrichMap),
    [commonFilms, enrichMap],
  )

  const corrValue =
    taste.correlation == null
      ? '—'
      : (taste.correlation >= 0 ? '+' : '') + taste.correlation.toFixed(2)
  const bias = biasText(taste.ratingBias, nameA, nameB)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <ScoreHero score={score} label={label} profileA={profiles.a} profileB={profiles.b}>
        <ShareActions result={result} enrichMap={enrichMap} shareUrl={shareUrl} />
      </ScoreHero>

      {/* Métriques clés (avec infobulles "?") */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard
          value={overlap.common.toLocaleString('fr-FR')}
          label="Films en commun"
          hint={`sur ${overlap.union.toLocaleString('fr-FR')} au total`}
          info="Nombre de films que vous avez vus tous les deux."
        />
        <StatCard
          value={pct(overlap.jaccard)}
          label="Indice de Jaccard"
          hint={
            <>
              {nameA} a vu <span className="text-ink">{pct(overlap.pctOfB)}</span> des
              films de {nameB}
              <br />
              {nameB} a vu <span className="text-ink">{pct(overlap.pctOfA)}</span> des
              films de {nameA}
            </>
          }
          tone="text-blue"
          info="Films communs ÷ films vus par l'un OU l'autre (100 % = la même liste). En dessous, le détail dans chaque sens : qui a vu quelle part du catalogue de l'autre."
        />
        <StatCard
          value={corrValue}
          label="Corrélation de Pearson"
          hint={correlationLabel(taste.correlation)}
          tone="text-green"
          info="De −1 à +1 : notez-vous les films dans le même sens ? +1 = goûts identiques, 0 = aucun lien, −1 = opposés. Calculée sur vos notes communes."
        />
        <StatCard
          value={
            taste.ratingBias == null
              ? '—'
              : Math.abs(taste.ratingBias) < 0.1
                ? '≈'
                : `${taste.ratingBias > 0 ? '+' : '−'}${Math.abs(taste.ratingBias).toFixed(1)}★`
          }
          label="Générosité des notes"
          hint={bias || `sur ${taste.sampleSize} films notés`}
          tone="text-orange"
          info={`Qui note le plus haut en moyenne, sur les ${taste.sampleSize} films notés par les deux. "+0.4★" = ${nameA} met en moyenne 0,4 étoile de plus que ${nameB}.`}
        />
      </div>

      {/* Méthodologie, assumée et lisible */}
      <details className="rounded-xl border border-line bg-card/60 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-ink">
          Comment le score est-il calculé ?
        </summary>
        <div className="mt-3 space-y-2 text-mut">
          <p>
            Le score mélange deux mesures classiques :{' '}
            <span className="text-green">la corrélation de Pearson</span> sur vos notes
            communes (est-ce qu'on aime et déteste les mêmes films ?) et{' '}
            <span className="text-blue">l'indice de Jaccard</span> de vos filmographies
            (à quel point nos cinémathèques se recoupent ?).
          </p>
          <p>
            Avec {taste.sampleSize} films co-notés, la pondération est de{' '}
            {taste.reliable ? '70 % goût / 30 % recoupement' : taste.correlation != null ? '40 % goût / 60 % recoupement (peu de notes communes : la corrélation est moins fiable)' : '100 % recoupement (aucune note comparable)'}.
            La corrélation est ramenée de [−1, +1] vers [0, 100] avant pondération.
          </p>
          {!taste.reliable && taste.correlation != null && (
            <p className="text-faint">
              ⚠️ Moins de 10 films notés en commun : prends la corrélation avec des
              pincettes.
            </p>
          )}
        </div>
      </details>

      <SectionLovedDivisive
        loved={lovedInCommon}
        divisive={divisive}
        nameA={nameA}
        nameB={nameB}
        enrichMap={enrichMap}
      />

      <InsightsSection
        genres={genres}
        directors={directors}
        nameA={nameA}
        nameB={nameB}
        pending={enriching}
      />

      <DecadesSection decades={decades} nameA={nameA} nameB={nameB} />

      <RecommendationsSection
        recommendations={recommendations}
        nameA={nameA}
        nameB={nameB}
        enrichMap={enrichMap}
      />

      <FavoritesCompare
        favorites={favorites}
        nameA={nameA}
        nameB={nameB}
        enrichMap={enrichMap}
      />

      <TopFlopCompare
        eyebrow="Derniers émois"
        title="Coups de cœur récents"
        subtitle="Films récemment adorés (4.5★+) ou likés par chacun."
        a={recentLoved.a}
        b={recentLoved.b}
        nameA={nameA}
        nameB={nameB}
        renderMeta={ratingMeta}
        enrichMap={enrichMap}
      />

      <TopFlopCompare
        eyebrow="Sans pitié"
        title="Flop 10"
        subtitle="Films les moins bien notés de chacun."
        a={flop.a}
        b={flop.b}
        nameA={nameA}
        nameB={nameB}
        enrichMap={enrichMap}
      />

      <div className="text-center">
        <button
          onClick={onReset}
          className="rounded-full border border-line bg-card px-6 py-2.5 font-medium text-mut transition hover:border-orange hover:text-ink"
        >
          ↺ Comparer d'autres profils
        </button>
      </div>
    </div>
  )
}
