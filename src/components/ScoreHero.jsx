import { toneClasses } from '../lib/format.js'

// Grand score circulaire + label.
export default function ScoreHero({ score, label, usernameA, usernameB }) {
  const tone = toneClasses[label.tone] || 'text-white'
  const circumference = 2 * Math.PI * 54
  const offset = circumference * (1 - score / 100)

  const stroke =
    label.tone === 'green' ? '#00e054' : label.tone === 'blue' ? '#40bcf4' : '#ff8000'

  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-4 text-lb-muted">
        <span className="font-semibold text-white">{usernameA}</span>
        {'  ✕  '}
        <span className="font-semibold text-white">{usernameB}</span>
      </p>

      <div className="relative h-40 w-40">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#2c343c"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-extrabold tabular-nums ${tone}`}>
            {score}
          </span>
          <span className="text-xs uppercase tracking-wider text-lb-muted">
            match
          </span>
        </div>
      </div>

      <h2 className={`mt-4 text-2xl font-bold ${tone}`}>{label.title}</h2>
    </div>
  )
}
