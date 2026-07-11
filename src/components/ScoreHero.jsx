import { toneClasses } from '../lib/format.js'
import ProfileBadge from './ProfileBadge.jsx'

// "Ticket de cinéma" : encoches perforées sur les côtés, ADMIT TWO, gros score
// serif au centre entre les deux avatars, verdict en italique.
export default function ScoreHero({ score, label, profileA, profileB, children }) {
  const tone = toneClasses[label.tone] || 'text-ink'
  const stroke =
    label.tone === 'green' ? '#00e054' : label.tone === 'blue' ? '#40bcf4' : '#ff8000'
  const circumference = 2 * Math.PI * 54
  const offset = circumference * (1 - score / 100)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card">
      {/* Encoches du ticket */}
      <span
        aria-hidden="true"
        className="absolute -left-3.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border border-line bg-night"
      />
      <span
        aria-hidden="true"
        className="absolute -right-3.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border border-line bg-night"
      />

      <div className="flex items-center justify-between border-b border-dashed border-line px-6 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-faint sm:px-10">
        <span>Ciné-compatibilité</span>
        <span className="hidden sm:inline">Séance pour deux</span>
        <span>Admit two</span>
      </div>

      <div className="px-3 py-8 sm:px-10">
        <div className="flex items-center justify-center gap-3 sm:gap-12">
          <ProfileBadge profile={profileA} accent="green" />

          <div className="relative h-28 w-28 shrink-0 sm:h-44 sm:w-44">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#272d36" strokeWidth="6" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={stroke}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`font-display text-4xl font-semibold tabular-nums sm:text-6xl ${tone}`}
              >
                {score}
              </span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-faint">
                / 100
              </span>
            </div>
          </div>

          <ProfileBadge profile={profileB} accent="blue" />
        </div>

        <h2 className={`mt-6 text-center font-display text-2xl italic sm:text-3xl ${tone}`}>
          « {label.title} »
        </h2>

        {children /* actions de partage, injectées par le dashboard */}
      </div>
    </div>
  )
}
