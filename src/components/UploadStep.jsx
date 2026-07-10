import { useState, useRef, useEffect } from 'react'

const ACCENTS = {
  green: {
    text: 'text-green',
    border: 'hover:border-green/70 focus-within:border-green/70',
    drag: 'border-green bg-green/5',
    activeTab: 'bg-green text-night',
  },
  blue: {
    text: 'text-blue',
    border: 'hover:border-blue/70 focus-within:border-blue/70',
    drag: 'border-blue bg-blue/5',
    activeTab: 'bg-blue text-night',
  },
}

// Champ de recherche d'un profil public, avec autocomplétion (API Letterboxd).
function PublicSearchInput({ accent, value, onChange }) {
  const a = ACCENTS[accent]
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Le parent peut injecter un pseudo (lien partagé ?a=&b=).
  useEffect(() => {
    if (value && value !== query) setQuery(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    const q = query.trim()
    onChange(q) // le texte tapé est utilisé même sans sélection dans la liste
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.results || [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const pick = (m) => {
    setQuery(m.username)
    onChange(m.username)
    setOpen(false)
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mut">
        Pseudo Letterboxd
      </label>
      <div className="relative">
        <div
          className={`flex items-center rounded-lg border border-line bg-well px-3 transition ${a.border}`}
        >
          <span className="text-mut" aria-hidden="true">
            @
          </span>
          <input
            type="text"
            placeholder="Tape un pseudo… (ex. nashkel)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full bg-transparent px-2 py-2.5 text-sm text-ink placeholder-faint outline-none"
            autoComplete="off"
            aria-label="Pseudo Letterboxd"
          />
          {loading && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-mut"
            />
          )}
        </div>

        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-night shadow-2xl">
            {results.map((m) => (
              <li key={m.username}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink/5"
                >
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-xs text-mut">
                      {m.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {m.displayName}
                    </span>
                    <span className="block truncate text-xs text-mut">@{m.username}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-xs text-faint">Le profil doit être public.</p>
    </div>
  )
}

function DropZone({ accent, value, onFiles }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const a = ACCENTS[accent]

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) onFiles([...e.dataTransfer.files])
  }

  return (
    <button
      type="button"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
        dragOver ? a.drag : 'border-line'
      } ${a.border}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.csv"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && onFiles([...e.target.files])}
        aria-label="Déposer un export Letterboxd (.zip ou .csv)"
      />
      {value ? (
        <p className="text-sm text-ink">
          <span className={a.text}>✓</span> {value}
        </p>
      ) : (
        <p className="text-sm text-mut">
          Glisse ton <span className="font-semibold text-ink">.zip</span> Letterboxd
          <br />
          ou clique pour choisir
        </p>
      )}
    </button>
  )
}

function ProfileInput({ accent, label, side, onChange }) {
  const a = ACCENTS[accent]
  const set = (patch) => onChange({ ...side, ...patch })

  const Tab = ({ mode, children }) => (
    <button
      type="button"
      onClick={() => set({ mode })}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
        side.mode === mode ? a.activeTab : 'text-mut hover:text-ink'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`font-display text-lg font-semibold ${a.text}`}>{label}</h2>
        <div className="flex gap-1 rounded-lg border border-line bg-well p-0.5">
          <Tab mode="public">Pseudo</Tab>
          <Tab mode="file">CSV</Tab>
        </div>
      </div>

      {side.mode === 'public' ? (
        <PublicSearchInput
          accent={accent}
          value={side.username}
          onChange={(username) => set({ username })}
        />
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Pseudo affiché (optionnel)"
            value={side.username}
            onChange={(e) => set({ username: e.target.value })}
            className={`w-full rounded-lg border border-line bg-well px-3 py-2.5 text-sm text-ink placeholder-faint outline-none transition ${a.border}`}
            aria-label="Pseudo affiché"
          />
          <DropZone
            accent={accent}
            value={side.filesLabel}
            onFiles={(files) =>
              set({
                files,
                filesLabel:
                  files.length === 1 ? files[0].name : `${files.length} fichiers`,
              })
            }
          />
          <p className="text-xs text-faint">
            🔒 Analysé dans ton navigateur — rien n'est envoyé au serveur.
          </p>
        </div>
      )}
    </div>
  )
}

const emptySide = () => ({ mode: 'public', files: null, filesLabel: null, username: '' })
const sideReady = (s) =>
  s.mode === 'file' ? !!s.files : s.username.trim().length > 0

export default function UploadStep({ onCompare, loading, error, initial }) {
  const [a, setA] = useState(() => ({ ...emptySide(), username: initial?.a || '' }))
  const [b, setB] = useState(() => ({ ...emptySide(), username: initial?.b || '' }))

  const ready = sideReady(a) && sideReady(b) && !loading

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <header className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-orange">
          Compatibilité cinéphile
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
          Vos goûts de cinéma,
          <br />
          <span className="italic">face à face.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-mut">
          Deux profils Letterboxd entrent, un score de compatibilité sort — avec vos
          films adorés en commun, vos genres partagés, vos désaccords assumés et de quoi
          remplir votre prochaine soirée ciné.
        </p>
      </header>

      <div className="relative mb-8 grid gap-6 sm:grid-cols-2 sm:gap-10">
        <ProfileInput accent="green" label="Profil 1" side={a} onChange={setA} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 font-display text-2xl italic text-faint sm:block"
        >
          vs
        </span>
        <ProfileInput accent="blue" label="Profil 2" side={b} onChange={setB} />
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-center text-sm text-orange"
        >
          {error}
        </p>
      )}

      <div className="text-center">
        <button
          disabled={!ready}
          onClick={() => onCompare(a, b)}
          className="rounded-full bg-ink px-8 py-3.5 font-semibold text-night transition enabled:hover:bg-orange enabled:hover:text-night disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Analyse en cours…' : 'Calculer la compatibilité'}
        </button>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-faint">
          Sous le capot : corrélation de Pearson sur vos notes communes, pondérée par
          l'indice de Jaccard de vos filmographies. Détail de la méthode dans les
          résultats.
        </p>
      </div>

      <details className="mx-auto mt-10 max-w-xl rounded-xl border border-line bg-card/60 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-ink">
          Comparer via un export CSV plutôt qu'un pseudo ?
        </summary>
        <p className="mt-3 text-mut">
          Bascule un profil sur l'onglet <span className="text-ink">CSV</span> puis
          dépose ton export Letterboxd. Pour l'obtenir :{' '}
          <span className="text-ink">Settings → Data → Export your data</span> (un
          fichier <span className="text-ink">.zip</span>, à déposer tel quel).
        </p>
        <p className="mt-2 text-xs text-faint">
          🔒 Les fichiers sont analysés dans ton navigateur, rien n'est envoyé au
          serveur. Le mode pseudo lit les pages publiques du profil côté serveur.
        </p>
      </details>
    </div>
  )
}
