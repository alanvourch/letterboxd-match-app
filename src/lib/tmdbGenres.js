// Ids de genres TMDB (stables, documentés) -> libellés français.
// Vit dans src/lib pour être partagé par le client (affichage des insights)
// sans dépendre du serveur.
export const TMDB_GENRES = {
  28: 'Action',
  12: 'Aventure',
  16: 'Animation',
  35: 'Comédie',
  80: 'Policier',
  99: 'Documentaire',
  18: 'Drame',
  10751: 'Familial',
  14: 'Fantastique',
  36: 'Histoire',
  27: 'Horreur',
  10402: 'Musique',
  9648: 'Mystère',
  10749: 'Romance',
  878: 'Science-fiction',
  10770: 'Téléfilm',
  53: 'Thriller',
  10752: 'Guerre',
  37: 'Western',
}

// Emoji par genre : rend les insights lisibles d'un coup d'œil, sans graphique.
export const GENRE_EMOJI = {
  28: '💥',
  12: '🗺️',
  16: '🎨',
  35: '😂',
  80: '🕵️',
  99: '🎥',
  18: '🎭',
  10751: '👨‍👩‍👧',
  14: '🐉',
  36: '📜',
  27: '👻',
  10402: '🎵',
  9648: '🔍',
  10749: '❤️',
  878: '🚀',
  10770: '📺',
  53: '🔪',
  10752: '⚔️',
  37: '🤠',
}
