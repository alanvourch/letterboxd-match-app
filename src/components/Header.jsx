// En-tête global : logo + nom du site, cliquable pour revenir à l'accueil.
export default function Header({ onHome }) {
  return (
    <header className="sticky top-0 z-40 border-b border-lb-border bg-lb-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
        <button
          onClick={onHome}
          className="group flex items-center gap-2 transition hover:opacity-90"
          title="Revenir à l'accueil"
        >
          <span className="flex h-7 w-7 items-center justify-center">
            <span className="relative block h-5 w-8">
              <span className="absolute left-0 top-0 h-5 w-5 rounded-full bg-lb-green/85" />
              <span className="absolute right-0 top-0 h-5 w-5 rounded-full bg-lb-blue/85" />
              <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lb-orange" />
            </span>
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Letterboxd <span className="text-lb-green">Match</span>
          </span>
        </button>
      </div>
    </header>
  )
}
