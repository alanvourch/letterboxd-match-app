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
import { pct, tasteLabel, biasText } from '../lib/format.js'
import { genreInsights, directorInsights, actorInsights } from '../lib/insights.js'

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
  const actors = useMemo(
    () => actorInsights(commonFilms, enrichMap),
    [commonFilms, enrichMap],
  )

  const bias = biasText(taste.ratingBias, nameA, nameB)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-10">
      <ScoreHero score={score} label={label} profileA={profiles.a} profileB={profiles.b}>
        <ShareActions result={result} enrichMap={enrichMap} shareUrl={shareUrl} />
      </ScoreHero>

      {/* Métriques clés, en français courant (les infobulles "?" détaillent) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard
          value={overlap.common.toLocaleString('fr-FR')}
          label="Films vus à deux"
          hint={`sur ${overlap.union.toLocaleString('fr-FR')} films au total`}
          tone="text-orange"
          info="Le nombre de films que vous avez vus tous les deux."
        />
        <StatCard
          value={taste.score == null ? '-' : `${taste.score}`}
          label="Accord de notes"
          hint={
            taste.agreement != null ? (
              <>
                {tasteLabel(taste.score)}
                <br />
                d'accord à ½★ près sur{' '}
                <span className="text-ink">{pct(taste.agreement)}</span> des films
              </>
            ) : (
              'pas assez de notes communes'
            )
          }
          tone="text-green"
          info={`De 0 à 100 : est-ce que vous mettez les mêmes notes aux mêmes films ? Calculé sur les ${taste.sampleSize} films que vous avez notés tous les deux.`}
        />
        <StatCard
          value={`${overlap.score}`}
          label="Recoupement"
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
          info="De 0 à 100 : à quel point vos collections de films se chevauchent. 100 = exactement les mêmes films."
        />
        <StatCard
          value={
            taste.ratingBias == null
              ? '-'
              : Math.abs(taste.ratingBias) < 0.1
                ? '≈'
                : `${taste.ratingBias > 0 ? '+' : '−'}${Math.abs(taste.ratingBias).toFixed(1)}★`
          }
          label="Générosité"
          hint={bias || `sur ${taste.sampleSize} films notés`}
          info={`Qui note le plus haut en moyenne ? "+0.4★" = ${nameA} met en moyenne 0,4 étoile de plus que ${nameB}.`}
        />
      </div>

      {/* Méthode, en langage courant */}
      <details className="rounded-xl border border-line bg-card/60 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-ink">
          Comment le score est-il calculé ?
        </summary>
        <div className="mt-3 space-y-2 text-mut">
          <p>
            Deux ingrédients : <span className="text-green">l'accord de notes</span>{' '}
            (mettez-vous les mêmes notes aux mêmes films ?) et{' '}
            <span className="text-blue">le recoupement</span> (à quel point vos
            collections de films se chevauchent).
          </p>
          <p>
            Avec {taste.sampleSize} films notés par vous deux, le score pèse{' '}
            {taste.reliable
              ? '70 % accord de notes + 30 % recoupement.'
              : taste.score != null
                ? "40 % accord + 60 % recoupement (peu de notes communes : l'accord est moins fiable)."
                : '100 % recoupement (aucune note comparable).'}
          </p>
          {!taste.reliable && taste.score != null && (
            <p className="text-faint">
              ⚠️ Moins de 10 films notés en commun : notez plus de films pour un score
              plus fiable !
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
        actors={actors}
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
        enrichMap={enrichMap}
        emptyText="Aucun coup de cœur récent."
      />

      <TopFlopCompare
        eyebrow="Sans pitié"
        title="Les flops de chacun"
        subtitle="Films notés 2.5★ ou moins, les navets assumés."
        a={flop.a}
        b={flop.b}
        nameA={nameA}
        nameB={nameB}
        enrichMap={enrichMap}
        emptyText="Aucun film détesté. Que de l'amour."
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
