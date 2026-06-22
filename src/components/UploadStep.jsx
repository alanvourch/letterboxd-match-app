import { useState, useRef, useEffect } from 'react'

const ACCENTS = {
  green: {
    text: 'text-lb-green',
    border: 'hover:border-lb-green focus-within:border-lb-green',
    drag: 'border-lb-green bg-lb-green/5',
    activeTab: 'bg-lb-green text-lb-bg',
  },
  blue: {
    text: 'text-lb-blue',
    border: 'hover:border-lb-blue focus-within:border-lb-blue',
    drag: 'border-lb-blue bg-lb-blue/5',
    activeTab: 'bg-lb-blue text-lb-bg',
  },
}

// Champ de recherche d'un profil public, avec autocomplétion (API Letterboxd).
function PublicSearchInput({ accent, value, onChange }) {
  const a = ACCENTS[accent]
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

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
    <div className="rounded-2xl border border-lb-border bg-lb-card/60 p-4">
      <label className="mb-2 block text-sm text-lb-muted">Pseudo Letterboxd</label>
      <div className="relative">
        <div className={`flex items-center rounded-lg border border-lb-border bg-lb-card px-3 ${a.border}`}>
          <span className="text-lb-muted">@</span>
          <input
            type="text"
            placeholder="Tape un pseudo… (ex. nashkel)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-lb-muted outline-none"
            autoComplete="off"
          />
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-lb-border border-t-lb-text" />
          )}
        </div>

        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-lb-border bg-lb-bg shadow-xl">
            {results.map((m) => (
              <li key={m.username}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
                >
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lb-card text-xs text-lb-muted">
                      {m.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {m.displayName}
                    </span>
                    <span className="block truncate text-xs text-lb-muted">
                      @{m.username}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-xs text-lb-muted">
        Le profil doit être public. Le chargement prend quelques secondes.
      </p>
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
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
        dragOver ? a.drag : 'border-lb-border'
      } ${a.border}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.csv"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && onFiles([...e.target.files])}
      />
      <div className="mb-2 text-3xl">{value ? '✅' : '📁'}</div>
      {value ? (
        <p className="text-sm text-lb-text">{value}</p>
      ) : (
        <p className="text-sm text-lb-muted">
          Glisse ton <span className="font-medium">.zip</span> Letterboxd
          <br />
          ou clique pour choisir
        </p>
      )}
    </div>
  )
}

function ProfileInput({ accent, label, side, onChange }) {
  const a = ACCENTS[accent]
  const set = (patch) => onChange({ ...side, ...patch })

  const Tab = ({ mode, children }) => (
    <button
      type="button"
      onClick={() => set({ mode })}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        side.mode === mode ? a.activeTab : 'bg-lb-bg text-lb-muted hover:text-white'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="space-y-3">
      <h2 className={`text-center font-bold ${a.text}`}>{label}</h2>

      <div className="flex gap-1 rounded-xl border border-lb-border bg-lb-bg p-1">
        <Tab mode="public">🔗 Pseudo public</Tab>
        <Tab mode="file">📁 Import CSV</Tab>
      </div>

      {side.mode === 'public' ? (
        <PublicSearchInput
          accent={accent}
          value={side.username}
          onChange={(username) => set({ username })}
        />
      ) : (
        <>
          <input
            type="text"
            placeholder="Pseudo affiché (optionnel)"
            value={side.username}
            onChange={(e) => set({ username: e.target.value })}
            className={`w-full rounded-lg border border-lb-border bg-lb-card px-3 py-2 text-sm text-white placeholder-lb-muted outline-none ${a.border}`}
          />
          <DropZone
            accent={accent}
            value={side.filesLabel}
            onFiles={(files) =>
              set({
                files,
                filesLabel: files.length === 1 ? files[0].name : `${files.length} fichiers`,
              })
            }
          />
        </>
      )}
    </div>
  )
}

const emptySide = () => ({ mode: 'public', files: null, filesLabel: null, username: '' })
const sideReady = (s) =>
  s.mode === 'file' ? !!s.files : s.username.trim().length > 0

export default function UploadStep({ onCompare, loading, error }) {
  const [a, setA] = useState(emptySide)
  const [b, setB] = useState(emptySide)

  const ready = sideReady(a) && sideReady(b) && !loading

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
          Êtes-vous <span className="text-lb-green">compatibles</span> ?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lb-text">
          Comparez deux profils Letterboxd : films vus en commun, accord sur les notes,
          coups de cœur partagés et désaccords. Entrez deux pseudos publics, c'est tout.
        </p>
      </header>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <ProfileInput accent="green" label="Profil 1" side={a} onChange={setA} />
        <ProfileInput accent="blue" label="Profil 2" side={b} onChange={setB} />
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-lb-orange/40 bg-lb-orange/10 px-4 py-3 text-center text-sm text-lb-orange">
          {error}
        </p>
      )}

      <div className="text-center">
        <button
          disabled={!ready}
          onClick={() => onCompare(a, b)}
          className="rounded-full bg-lb-green px-8 py-3 font-bold text-lb-bg transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Analyse en cours…' : 'Calculer la compatibilité'}
        </button>
      </div>

      <details className="mx-auto mt-10 max-w-xl rounded-xl border border-lb-border bg-lb-card/50 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-white">
          Comparer via un export CSV plutôt qu'un pseudo ?
        </summary>
        <p className="mt-3 text-lb-text">
          Bascule un profil sur <span className="text-white">📁 Import CSV</span> puis dépose
          ton export Letterboxd. Pour l'obtenir :{' '}
          <span className="text-white">Settings → Data → Export your data</span> (un fichier
          <span className="text-white"> .zip</span>, à déposer tel quel).
        </p>
        <p className="mt-2 text-xs text-lb-muted">
          🔒 Les fichiers sont analysés dans ton navigateur. Le mode pseudo lit les pages
          publiques du profil via un petit service local.
        </p>
      </details>
    </div>
  )
}
