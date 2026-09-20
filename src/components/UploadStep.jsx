import { useState, useRef, useEffect } from 'react'

const ACCENTS = {
  green: {
    text: 'text-green',
    border: 'hover:border-green/70 focus-within:border-green/70',
    ring: 'ring-green/70',
    chipBorder: 'border-green/40',
  },
  blue: {
    text: 'text-blue',
    border: 'hover:border-blue/70 focus-within:border-blue/70',
    ring: 'ring-blue/70',
    chipBorder: 'border-blue/40',
  },
}

// Champ de recherche d'un profil public, avec autocomplétion (API Letterboxd).
// Sélectionner un membre affiche une "carte membre" (avatar + nom) : un seul
// clic suffit, et la liste ne se rouvre pas toute seule.
function PublicSearchInput({ accent, value, onChange }) {
  const a = ACCENTS[accent]
  const [query, setQuery] = useState(value || '')
  const [selected, setSelected] = useState(null) // { username, displayName, avatarUrl }
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // Le parent peut injecter un pseudo (lien partagé ?a=&b=).
  useEffect(() => {
    if (value && value !== query && !selected) setQuery(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (selected) return // un membre est choisi : plus de recherche
    const q = query.trim()
    onChange(q) // le texte tapé est utilisé même sans sélection dans la liste
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    // AbortController : une réponse lente d'une frappe précédente ne doit
    // jamais écraser les résultats de la frappe courante.
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        })
        const data = await res.json()
        setResults(data.results || [])
        setOpen(true)
        setLoading(false)
      } catch (e) {
        if (e.name === 'AbortError') return // frappe suivante en cours
        setResults([])
        setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected])

  const pick = (m) => {
    setSelected(m)
    setQuery(m.username)
    onChange(m.username)
    setResults([])
    setOpen(false)
  }

  const clear = () => {
    setSelected(null)
    setQuery('')
    onChange('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  if (selected) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border bg-well px-3 py-2.5 ${a.chipBorder}`}
      >
        {selected.avatarUrl ? (
          <img
            src={selected.avatarUrl}
            alt=""
            className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${a.ring}`}
          />
        ) : (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card font-display text-base italic ring-2 ${a.ring} ${a.text}`}
          >
            {(selected.displayName || selected.username).charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {selected.displayName || selected.username}
          </span>
          <span className="block truncate text-xs text-mut">@{selected.username}</span>
        </span>
        <button
          type="button"
          onClick={clear}
          aria-label="Changer de profil"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-mut transition hover:bg-ink/10 hover:text-ink"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className={`flex items-center rounded-xl border border-line bg-well px-3 transition ${a.border}`}
      >
        <span className="text-mut" aria-hidden="true">
          @
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Cherche un pseudo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full bg-transparent px-2 py-3 text-base text-ink placeholder-faint outline-none sm:text-sm"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
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
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-night shadow-2xl">
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
  )
}

function ProfileInput({ accent, label, side, onChange }) {
  const a = ACCENTS[accent]
  const set = (patch) => onChange({ ...side, ...patch })

  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
      <h2 className={`mb-3 font-display text-lg font-semibold ${a.text}`}>{label}</h2>
      <PublicSearchInput
        accent={accent}
        value={side.username}
        onChange={(username) => set({ username })}
      />
    </div>
  )
}

const emptySide = () => ({ username: '' })
const sideReady = (s) => s.username.trim().length > 0

export default function UploadStep({ onCompare, loading, error, onEdit, initial }) {
  const [a, setA] = useState(() => ({ ...emptySide(), username: initial?.a || '' }))
  const [b, setB] = useState(() => ({ ...emptySide(), username: initial?.b || '' }))

  const ready = sideReady(a) && sideReady(b) && !loading

  // Une erreur affichée disparaît dès que l'utilisateur corrige quelque chose.
  const editA = (v) => {
    setA(v)
    onEdit?.()
  }
  const editB = (v) => {
    setB(v)
    onEdit?.()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8 text-center sm:mb-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-orange">
          Le match des cinéphiles
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
          Vos goûts de cinéma,
          <br />
          <span className="italic">face à face.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-mut">
          Entre deux pseudos Letterboxd et découvre votre score de compatibilité :
          les films que vous adorez tous les deux, vos plus gros désaccords, et de
          quoi remplir votre prochaine soirée ciné.
        </p>
      </header>

      <div className="relative mb-8 grid gap-8 sm:grid-cols-2 sm:gap-10">
        <ProfileInput accent="green" label="Profil 1" side={a} onChange={editA} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-night font-display text-sm italic text-orange shadow-lg"
        >
          vs
        </span>
        <ProfileInput accent="blue" label="Profil 2" side={b} onChange={editB} />
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
          onClick={() => onCompare({ mode: 'public', ...a }, { mode: 'public', ...b })}
          className="w-full rounded-full bg-ink px-8 py-3.5 font-semibold text-night transition enabled:hover:bg-orange enabled:hover:text-night disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {loading ? 'Analyse en cours…' : '♥ Calculer notre match'}
        </button>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-faint">
          Les deux profils doivent être publics. On lit les films, notes et likes de
          chacun, rien n'est conservé.
        </p>
      </div>
    </div>
  )
}
