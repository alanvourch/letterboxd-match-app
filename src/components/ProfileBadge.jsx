// Avatar + nom d'un profil, cliquable vers la page Letterboxd si connue.
// Avatar absent (cas CSV sans scraping) -> pastille avec l'initiale.
export default function ProfileBadge({ profile, accent = 'green' }) {
  const ring = accent === 'green' ? 'ring-green/70' : 'ring-blue/70'
  const textAccent = accent === 'green' ? 'text-green' : 'text-blue'
  const initial = (profile.username || '?').trim().charAt(0).toUpperCase()

  const avatar = profile.avatarUrl ? (
    <img
      src={profile.avatarUrl}
      alt={`Avatar de ${profile.username}`}
      className={`h-16 w-16 rounded-full object-cover ring-2 sm:h-20 sm:w-20 ${ring}`}
    />
  ) : (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-full bg-well font-display text-2xl italic ring-2 sm:h-20 sm:w-20 ${ring} ${textAccent}`}
    >
      {initial}
    </div>
  )

  const body = (
    <>
      {avatar}
      <span
        className={`mt-2 block max-w-[5.5rem] truncate text-sm font-semibold sm:max-w-[9rem] ${textAccent}`}
      >
        {profile.username}
      </span>
      {profile.watchedCount != null && (
        <span className="block text-xs tabular-nums text-faint">
          {profile.watchedCount.toLocaleString('fr-FR')} films
        </span>
      )}
    </>
  )

  if (profile.profileUrl) {
    return (
      <a
        href={profile.profileUrl}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center text-center transition hover:opacity-85"
        title={`Voir ${profile.username} sur Letterboxd`}
      >
        {body}
      </a>
    )
  }

  return <div className="flex flex-col items-center text-center">{body}</div>
}
