import { parseZip, parseLooseCsvs } from './parseLetterboxd.js'
import { filmKey } from './filmKey.js'

/**
 * Point d'entrée unique pour charger un profil, quelle que soit la source.
 * Renvoie toujours le même format `Profile` -> le moteur de compatibilité
 * ne connaît jamais l'origine des données.
 *
 * Phase 2 : ajouter `source.type === 'public'` qui appellera un backend de
 * scraping renvoyant le même format. Le reste de l'app ne bougera pas.
 *
 * @param {{type:'zip'|'csv', files: File[]|File, username?: string}} source
 * @returns {Promise<Profile>}
 */
export async function loadProfile(source) {
  if (source?.type === 'public') {
    return fetchPublicProfile(source.username)
  }

  if (!source || !source.files) {
    throw new Error('Aucun fichier fourni.')
  }

  if (source.type === 'zip') {
    const file = Array.isArray(source.files) ? source.files[0] : source.files
    return parseZip(file, source.username)
  }

  if (source.type === 'csv') {
    const files = Array.isArray(source.files) ? source.files : [source.files]
    return parseLooseCsvs(files, source.username)
  }

  throw new Error(`Source inconnue : ${source.type}`)
}

// Récupère un profil public via le backend de scraping et reconstruit la Map
// `films` (le réseau ne transporte qu'un tableau sérialisable).
async function fetchPublicProfile(username) {
  const name = (username || '').trim()
  if (!name) throw new Error('Entre un pseudo Letterboxd.')

  let res
  try {
    res = await fetch(`/api/profile/${encodeURIComponent(name)}`)
  } catch {
    throw new Error(
      'Backend injoignable. Lance-le avec `npm run server` (ou `npm run dev`).',
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Échec du chargement de « ${name} ».`)
  }

  const films = new Map()
  for (const f of data.films) films.set(filmKey(f.name, f.year), f)
  return {
    username: data.username || name,
    profileUrl: data.profileUrl || `https://letterboxd.com/${name.toLowerCase()}/`,
    avatarUrl: data.avatarUrl || null,
    films,
    favorites: data.favorites || [],
  }
}

/**
 * Détecte le type de source à partir des fichiers déposés (drag & drop / input).
 * @param {File[]} files
 * @returns {{type:'zip'|'csv', files: File[]}}
 */
export function detectSource(files) {
  const arr = [...files]
  const zip = arr.find((f) => f.name.toLowerCase().endsWith('.zip'))
  if (zip) return { type: 'zip', files: [zip] }
  const csvs = arr.filter((f) => f.name.toLowerCase().endsWith('.csv'))
  if (csvs.length) return { type: 'csv', files: csvs }
  throw new Error('Dépose un fichier .zip (export Letterboxd) ou des fichiers .csv.')
}
