// Avatar + nom d'un profil, cliquable vers la page Letterboxd si connue.
// Avatar absent (cas CSV sans scraping) -> pastille avec l'initiale.
export default function ProfileBadge({ profile, accent = 'green', size = 'lg' }) {
  const dims = size === 'lg' ? 'h-20 w-20' : 'h-12 w-12'
  const ring = accent === 'green' ? 'ring-lb-green/60' : 'ring-lb-blue/60'
  const textAccent = accent === 'green' ? 'text-lb-green' : 'text-lb-blue'
  const initial = (profile.username || '?').trim().charAt(0).toUpperCase()

  const avatar = profile.avatarUrl ? (
    <img
      src={profile.avatarUrl}
      alt={profile.username}
      className={`${dims} rounded-full object-cover ring-2 ${ring}`}
      loading="lazy"
    />
  ) : (
    <div
      className={`${dims} flex items-center justify-center rounded-full bg-lb-card text-2xl font-bold ring-2 ${ring} ${textAccent}`}
    >
      {initial}
    </div>
  )

  const name = (
    <span className={`mt-2 block max-w-[8rem] truncate font-semibold ${textAccent}`}>
      {profile.username}
    </span>
  )

  if (profile.profileUrl) {
    return (
      <a
        href={profile.profileUrl}
        target="_blank"
        rel="noreferrer"
        className="group flex flex-col items-center text-center transition hover:opacity-90"
        title={`Voir ${profile.username} sur Letterboxd`}
      >
        {avatar}
        <span className="mt-2 block max-w-[8rem] truncate font-semibold text-white group-hover:underline">
          {profile.username}
        </span>
      </a>
    )
  }

  return (
    <div className="flex flex-col items-center text-center">
      {avatar}
      {name}
    </div>
  )
}
