import { useState, useRef } from 'react'

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
        <Tab mode="file">📁 Mon export</Tab>
        <Tab mode="public">🔗 Pseudo public</Tab>
      </div>

      {side.mode === 'file' ? (
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
      ) : (
        <div className="rounded-2xl border border-lb-border bg-lb-card/60 p-4">
          <label className="mb-2 block text-sm text-lb-muted">
            Pseudo Letterboxd (profil public)
          </label>
          <div className="flex items-center rounded-lg border border-lb-border bg-lb-card px-3">
            <span className="text-lb-muted">@</span>
            <input
              type="text"
              placeholder="ex. nashkel"
              value={side.username}
              onChange={(e) => set({ username: e.target.value })}
              className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-lb-muted outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-lb-muted">
            Le profil doit être public. Le chargement peut prendre quelques secondes.
          </p>
        </div>
      )}
    </div>
  )
}

const emptySide = () => ({ mode: 'file', files: null, filesLabel: null, username: '' })
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
          Letterboxd <span className="text-lb-green">Match</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lb-text">
          Comparez deux profils et découvrez votre compatibilité cinéphile. Déposez
          votre export, ou comparez-vous à n'importe quel pseudo public.
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
          Comment récupérer mes données Letterboxd ?
        </summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-lb-text">
          <li>
            Sur letterboxd.com :{' '}
            <span className="text-white">Settings → Data → Export your data</span>
          </li>
          <li>Vous recevez un fichier <span className="text-white">.zip</span></li>
          <li>Déposez-le directement ici (pas besoin de le décompresser)</li>
        </ol>
        <p className="mt-3 text-xs text-lb-muted">
          🔒 Les fichiers sont analysés dans votre navigateur. Le mode « pseudo public »
          lit les pages publiques du profil via un petit service local.
        </p>
      </details>
    </div>
  )
}
