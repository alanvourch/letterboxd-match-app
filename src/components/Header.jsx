// En-tête global : logo tri-points + wordmark, lien GitHub à droite.
export default function Header({ onHome }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-night/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button
          onClick={onHome}
          className="group flex items-center gap-2.5 transition hover:opacity-90"
          title="Revenir à l'accueil"
        >
          <span aria-hidden="true" className="relative block h-5 w-8">
            <span className="absolute left-0 top-0 h-5 w-5 rounded-full bg-green/85" />
            <span className="absolute right-0 top-0 h-5 w-5 rounded-full bg-blue/85" />
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Letterboxd&nbsp;<span className="italic text-orange">Match</span>
          </span>
        </button>

        <a
          href="https://github.com/alanvourch/letterboxd-match-app"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-mut transition hover:text-ink"
        >
          GitHub ↗
        </a>
      </div>
    </header>
  )
}
