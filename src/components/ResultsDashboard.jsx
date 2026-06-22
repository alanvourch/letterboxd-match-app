import ScoreHero from './ScoreHero.jsx'
import StatCard from './StatCard.jsx'
import SectionLovedDivisive from './SectionLovedDivisive.jsx'
import RecommendationsSection from './RecommendationsSection.jsx'
import TopFlopCompare from './TopFlopCompare.jsx'
import FavoritesCompare from './FavoritesCompare.jsx'
import { ratingMeta } from './FilmList.jsx'
import { pct, correlationLabel, biasText } from '../lib/format.js'

export default function ResultsDashboard({ result, onReset }) {
  const {
    profiles,
    score,
    label,
    overlap,
    taste,
    lovedInCommon,
    divisive,
    recommendations,
    recentLoved,
    flop,
    favorites,
  } = result
  const nameA = profiles.a.username
  const nameB = profiles.b.username

  const corrValue =
    taste.correlation == null
      ? '—'
      : (taste.correlation >= 0 ? '+' : '') + taste.correlation.toFixed(2)
  const bias = biasText(taste.ratingBias, nameA, nameB)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div className="rounded-2xl border border-lb-border bg-lb-card/60 p-8">
        <ScoreHero
          score={score}
          label={label}
          profileA={profiles.a}
          profileB={profiles.b}
        />
      </div>

      {/* Métriques clés (avec infobulles "?") */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          value={overlap.common}
          label="Films vus en commun"
          hint={`sur ${overlap.union} au total`}
          info="Nombre de films que vous avez vus tous les deux."
        />
        <StatCard
          value={pct(overlap.jaccard)}
          label="Taux de recoupement"
          hint={
            <>
              {nameA} a vu <span className="text-white">{pct(overlap.pctOfB)}</span> des
              films de {nameB}
              <br />
              {nameB} a vu <span className="text-white">{pct(overlap.pctOfA)}</span> des
              films de {nameA}
            </>
          }
          tone="text-lb-blue"
          info="Le grand chiffre = part de films communs parmi tous les films vus par l'un OU l'autre (100% = exactement la même liste). En dessous, le détail dans chaque sens : qui a vu quelle part du catalogue de l'autre."
        />
        <StatCard
          value={corrValue}
          label="Corrélation des notes"
          hint={correlationLabel(taste.correlation)}
          tone="text-lb-green"
          info="De −1 à +1 : notez-vous les films dans le même sens ? +1 = goûts identiques, 0 = aucun lien, −1 = opposés. Ex. +0.34 = tendance positive modérée (quand l'un aime, l'autre aime souvent aussi)."
        />
        <StatCard
          value={taste.meanDiff == null ? '—' : taste.meanDiff.toFixed(2)}
          label="Écart moyen de notes"
          hint={`sur ${taste.sampleSize} film${taste.sampleSize > 1 ? 's' : ''} notés`}
          tone="text-lb-orange"
          info="Différence moyenne entre vos notes sur les films notés par vous deux (en étoiles). Toujours positif : c'est une distance. 0.3 = très proches, 1+ = vous divergez souvent."
        />
      </div>

      {/* Aide à la lecture */}
      <details className="rounded-xl border border-lb-border bg-lb-card/40 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-white">
          Comment lire ces résultats ?
        </summary>
        <ul className="mt-3 space-y-2 text-lb-text">
          <li>
            <span className="font-semibold text-lb-blue">Taux de recoupement</span> : à quel
            point vos cinémathèques se chevauchent. Indépendant de vos notes.
          </li>
          <li>
            <span className="font-semibold text-lb-green">Corrélation</span> : le vrai
            indicateur de goût. Mesure si vous êtes d'accord sur ce qui est bon ou
            mauvais. Un <span className="text-white">+0.34</span> signifie un accord
            positif modéré ; au-delà de <span className="text-white">+0.6</span> vous êtes
            très alignés ; en négatif, vos avis s'opposent.
          </li>
          <li>
            <span className="font-semibold text-lb-orange">Écart moyen</span> : toujours
            positif (c'est une distance entre vos notes).
            {bias && <span className="text-white"> {bias}</span>}
          </li>
          {!taste.reliable && taste.correlation != null && (
            <li className="text-lb-muted">
              ⚠️ Seulement {taste.sampleSize} films notés en commun : la corrélation est
              indicative, prends-la avec des pincettes.
            </li>
          )}
        </ul>
      </details>

      <SectionLovedDivisive
        loved={lovedInCommon}
        divisive={divisive}
        nameA={nameA}
        nameB={nameB}
      />

      <RecommendationsSection
        recommendations={recommendations}
        nameA={nameA}
        nameB={nameB}
      />

      <FavoritesCompare favorites={favorites} nameA={nameA} nameB={nameB} />

      <TopFlopCompare
        title="❤️ Derniers coups de cœur"
        subtitle="Films récemment adorés (4.5★+) ou likés par chacun"
        a={recentLoved.a}
        b={recentLoved.b}
        nameA={nameA}
        nameB={nameB}
        renderMeta={ratingMeta}
      />

      <TopFlopCompare
        title="💀 Flop 10"
        subtitle="Films les moins bien notés de chacun"
        a={flop.a}
        b={flop.b}
        nameA={nameA}
        nameB={nameB}
      />

      <div className="text-center">
        <button
          onClick={onReset}
          className="rounded-full border border-lb-border bg-lb-card px-6 py-2.5 font-medium text-lb-text transition hover:border-lb-blue hover:text-white"
        >
          ↺ Comparer d'autres profils
        </button>
      </div>
    </div>
  )
}
