# Letterboxd Match

Web-app qui compare deux profils Letterboxd et calcule un **score de compatibilité cinéphile**. Deux façons de fournir un profil :

- **Pseudo public** (par défaut) : on tape un pseudo — avec **autocomplétion** (API officielle de recherche Letterboxd) — et l'app lit les pages publiques du profil via un petit service local.
- **Export CSV** déposé dans l'app (analysé 100 % côté navigateur, données privées).

On peut mélanger les deux (ex. ton CSV contre le pseudo public d'un ami).

Le résultat affiche : score + avatars cliquables, taux de recoupement, corrélation des notes, coups de cœur communs / films clivants, recommandations croisées, derniers coups de cœur, favoris (avec affiches) et flop de chacun.

## Lancer le projet

```bash
npm install
npm run dev      # lance le front (5173) ET l'API de scraping (3001)
npm run build    # build de production dans dist/

# Tests
node scripts/smoke-test.mjs          # chaîne parsing + compatibilité (données synthétiques)
node scripts/test-real-data.mjs      # contre un vrai export présent dans le repo
node scripts/test-scrape.mjs <user>  # scrape un profil public et le compare à son CSV
```

> Le mode « pseudo public » nécessite **curl** (présent nativement sur Windows 10+/macOS/Linux), car le client HTTP de Node est bloqué par la protection anti-bot de Letterboxd.

## Comment obtenir ses données

Sur letterboxd.com : **Settings → Data → Export your data**. On obtient un `.zip` à déposer directement dans l'app (pas besoin de le décompresser). Les CSV individuels sont aussi acceptés. Sinon, entre simplement un pseudo public.

## Ce que l'app calcule (v1)

À partir de `ratings.csv`, `watched.csv`, `diary.csv`, `likes/films.csv` et `profile.csv` :

- **Score de compatibilité** : mélange pondéré de la corrélation des notes (goût) et du recoupement des films vus.
- **Recoupement** : films vus en commun, indice de Jaccard.
- **Corrélation des notes** (Pearson) + écart moyen, sur les films notés par les deux.
- **Adorés en commun** (4.5★+ ou likés des deux) et **films clivants** (gros désaccords).
- **Top 10 / Flop 10** de chacun, **favoris officiels** et favoris partagés.

## Architecture

```
src/lib/
  filmKey.js           identité canonique d'un film (nom+année), partagée CSV/scrape
  loadProfile.js       point d'entrée unique, source-agnostique (zip / csv / public)
  parseLetterboxd.js   parsing zip/CSV -> Profile normalisé
  compatibility.js     moteur de calcul (fonctions pures)
  format.js            helpers d'affichage
src/components/        UI React (upload + dashboard de résultats)
server/
  scrapeLetterboxd.js  scraping d'un profil public -> même format Profile
  searchMembers.js     autocomplétion via l'API officielle Letterboxd
  index.js             API Express (/api/profile/:username, /api/search/:query) + cache
```

`loadProfile(source)` renvoie toujours le même format `Profile` quelle que soit la source ; le moteur et l'UI ignorent l'origine des données. CSV et scraping s'alignent grâce à `filmKey` (nom + année).

## Limites

Letterboxd ne fournit ni genre, ni réalisateur, ni popularité, ni affiche (ni dans le CSV ni facilement au scraping). Les fonctionnalités « genre/réalisateur préféré » et « films rares en commun » nécessiteraient un enrichissement TMDB.
