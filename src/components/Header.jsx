import Logo from './Logo.jsx'

// En-tête global : logo (pastilles + cœur) + wordmark, lien GitHub à droite.
export default function Header({ onHome }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-night/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button
          onClick={onHome}
          className="group flex items-center gap-2.5 transition hover:opacity-90"
          title="Revenir à l'accueil"
        >
          <Logo className="h-6 w-9" />
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
