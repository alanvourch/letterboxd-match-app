# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev                    # runs BOTH vite (5173) + scraper API (3001) via concurrently
npm run dev:web                # vite only
npm run server                 # scraper API only (node server/index.js, port 3001)
npm run build                  # production build into dist/
npm run preview                # serve the built dist/

# Tests (plain node scripts, set non-zero exit on failure):
node scripts/smoke-test.mjs            # synthetic .zip -> parse -> compatibility asserts
node scripts/test-real-data.mjs        # parses the real export folder if present, self-compare sanity
node scripts/test-scrape.mjs <user>    # live-scrapes a public profile, compares vs the CSV export
```

There is no linter or unit-test framework. The `scripts/*.mjs` files are the test suite. Run `smoke-test` + `test-real-data` after touching anything in `src/lib/`; run `test-scrape` after touching `server/`. Build failures are the main signal for component/import errors. `test-real-data`/`test-scrape` depend on a real export folder (`letterboxd-*/`, gitignored) being present.

## Architecture

React app (Vite + Tailwind). CSV uploads are parsed **in the browser**; comparing against a **public username** scrapes via a small Node/Express backend (`server/`) — required because Letterboxd has no API and the browser can't cross-origin fetch it.

The core design constraint: **`src/lib/` is framework-free and pure; `src/components/` is all the React; `server/` is the scraper.** `src/lib/filmKey.js` is shared by the browser, the lib, and the server — it is the single source of film identity. Keep parsing and scoring logic out of components.

Data flows in one direction through these layers:

1. **`src/lib/loadProfile.js`** — the single, source-agnostic entry point. `loadProfile(source)` always returns the same normalized `Profile` shape regardless of input: `source.type` is `zip` / `csv` (parsed locally) or `public` (fetched from `/api/profile/:username`, then the serialized film array is rebuilt into the `Map`). The engine and UI never know the origin. Do not bypass it.

2. **`src/lib/parseLetterboxd.js`** — turns a Letterboxd `.zip` (or loose CSVs) into a `Profile`. Merges `ratings.csv`, `watched.csv`, `diary.csv`, `likes/films.csv`, and `profile.csv` into a single `Map` keyed by **`name + year`** (`filmKey()`), the only stable film identity across files. A separate `uriIndex` (URI → film) is built only from files that expose the *film* URI, and is used to resolve favorites. Favorites come from the `Favorite Films` column of `profile.csv` (a quoted, comma-separated list of film URLs).

3. **`src/lib/compatibility.js`** — `computeCompatibility(profileA, profileB)` returns the full result object the dashboard renders. All functions are pure (Profiles in → plain object out), so they are unit-testable without React. It compares two profiles by their `Map` keys (`name+year`), which is exactly why CSV-vs-scrape works: both sources produce identical keys via `filmKey`.

**`server/scrapeLetterboxd.js`** — scrapes a public profile into the serializable Profile shape. Films come from `/{user}/films/` (paginated, with ratings), likes from `/{user}/likes/films/`, favorites from the profile page `#favourites` section. Each film is a `LazyPoster` React component carrying `data-item-full-display-name="Title (Year)"` + `data-item-slug`; ratings live in a sibling `.poster-viewingdata[data-item-uid]` with a `rated-N` class (N/2 stars), joined to the film by the shared `film:ID` uid.

`App.jsx` holds the only app state (upload screen vs. results) and wires layer 1 → layer 3 → `ResultsDashboard`.

### The `Profile` shape (the contract between layers)

```
Profile = {
  username,                          // display name (avatar img alt for scrape, profile.csv Username for CSV)
  profileUrl,                        // letterboxd.com/<handle>/ or null (CSV without profile.csv)
  avatarUrl,                         // scrape only (og:image); null for CSV
  films: Map<key, { uri, name, year, rating|null, watched, liked, isFavorite, date }>,  // key = filmKey(name, year)
  favorites: [{ uri, name, year, posterUrl }]   // up to 4; posterUrl scrape-only
}
```

`film.date` = most recent activity date (ISO). CSV fills it from the various `Date`/`Watched Date` columns; scrape leaves it null but inserts films in watch-date order (it scrapes `/films/by/date/`), so Map insertion order = recency. `computeCompatibility` uses this for `recentLoved` (recent 4.5★+/liked films — sort by `date` if present, else keep insertion order). It also returns `recommendations` (each side's gems — rating≥4 or liked — the other hasn't watched, top 5) and `taste.ratingBias` (signed mean of `ratingA - ratingB`; positive ⇒ A rates more generously). `result.profiles.{a,b}` carry `username`/`profileUrl`/`avatarUrl` for the clickable `ProfileBadge` in `ScoreHero`.

**Member search** (`server/searchMembers.js`, `GET /api/search/:query`) uses Letterboxd's official `api.letterboxd.com/api/v0/search` — it answers member queries WITHOUT auth (the rest of that API needs a key). Used only for the autocomplete in the public-profile input. Favorite posters are fetched **early** in `scrapeProfile` (right after the profile page, before the heavy pagination) because the IP gets rate-limited after ~40 page requests; they're cosmetic so failure is tolerated (single attempt, no retry).

A film counts as "watched" if `watched || rating != null || liked` (see `isWatched` in compatibility.js).

`computeCompatibility` iterates film Map **keys** (which are `name+year`, not URLs). When building result objects it must expose the real `film.uri` for links — never the key. The `uri` field on `ratedPairs`/`lovedInCommon` results comes from `fa.uri ?? fb.uri` for this reason.

## Things that will bite you

- **`diary.csv`'s `Letterboxd URI` is the diary-entry URL, NOT the film URL** (confirmed on real data — the same film has a different URI in `diary.csv` than in `watched`/`ratings`/`likes`). This is exactly why the canonical key is `name+year`, not URI. `ingestDiary` passes `isFilmUri=false` so the diary URI never pollutes the film URI or `uriIndex`. Don't "simplify" this back to URI keying.
- **CSV parsing is deliberately tolerant.** URIs are `boxd.it` short links; favorites are matched by exact URI then by trailing slug. Everything degrades gracefully if a file/column is missing. Be careful editing `parseFavorites` / `pick` / `findEntry`.
- **Score formula** (compatibility.js): blends Pearson rating correlation (taste) with Jaccard overlap. Weighting shifts based on how many films were co-rated, and falls back to overlap-only when there are no comparable ratings. Tune the constants at the top of the file (`LOVED_THRESHOLD`, `DIVISIVE_THRESHOLD`, `MIN_RATINGS_FOR_TASTE`).
- **CSV has no genre/director/popularity/posters.** Those features require TMDB enrichment and cannot be derived from the export alone.

### Scraper gotchas (`server/scrapeLetterboxd.js`)
- **Node's `fetch` (undici) gets 403 from Letterboxd** (Cloudflare TLS-fingerprint block) even with browser headers. We shell out to **`curl`** instead (present on Win10+/macOS/Linux). Don't "modernize" this back to `fetch`/axios — they share Node's TLS fingerprint and will be blocked too.
- **Rate-limiting (403/429) is real.** Concurrency is capped at 3, sections are fetched sequentially, and `fetchHtml` retries with exponential backoff. Raising these will get the scraper blocked mid-run.
- **Two pagination styles.** The films page has numbered pages (`.paginate-pages`) → fast parallel fetch. The likes page only has next/prev → sequential "until a page has < 72 posters". `numberedLastPage` must read ONLY `.paginate-pages a` (not the next/prev link, whose href is `/page/2/` and would falsely cap the total at 2).
- **`diary.csv` URI ≠ film URI** (see above) and **scrape URI (`letterboxd.com/film/slug`) ≠ CSV URI (`boxd.it/...`)**. Never match films across sources by URI — always by `filmKey(name, year)`. This is why shared-favorites in compatibility.js compares names, not URIs.
