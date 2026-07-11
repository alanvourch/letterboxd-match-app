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
node scripts/test-real-data.mjs        # parses the real export folder if present (skips cleanly if absent)
node scripts/test-scrape.mjs <user>    # live-scrapes a public profile, compares vs the CSV export

# Visual/browser tooling (Edge headless via puppeteer-core, Windows path hardcoded):
node scripts/screenshot.mjs <url> <out.png> [width] [fullpage|viewport] [waitSel] [waitMs] [height]
node scripts/shot-section.mjs <url> <out.png> <h3-text>   # screenshot of one dashboard section
node scripts/test-sharecard.mjs <userA> <userB> <out.png> # renders the share card in a real browser
```

There is no linter or unit-test framework. The `scripts/*.mjs` files are the test suite; CI (`.github/workflows/ci.yml`) runs build + smoke-test on every push. Run `smoke-test` + `test-real-data` after touching anything in `src/lib/`; run `test-scrape` after touching `server/`. Build failures are the main signal for component/import errors. `test-real-data`/`test-scrape` depend on a real export folder (`letterboxd-*/`, gitignored) being present.

Secrets live in `.env` (gitignored): `TMDB_API_KEY` (v3 key or v4 token, both accepted). `server/index.js` loads it via `process.loadEnvFile` (no dotenv dep). Without it the app still works — `/api/enrich` returns `{available:false}` and the UI hides posters/genre/director insights.

## Architecture

React app (Vite + Tailwind). The UI compares two **public usernames**, scraped via a Node backend — required because Letterboxd has no API and the browser can't cross-origin fetch it. (The CSV/zip parsing layer still exists in `src/lib/` and is exercised by the tests — it's the ground truth for scrape validation — but the UI no longer exposes an upload; the feature was dropped as unused.)

The core design constraint: **`src/lib/` is framework-free (no React); `src/components/` is all the React; `server/` is backend logic, framework-agnostic; `api/` is the thin Vercel wrapper.** `src/lib/filmKey.js` is shared by the browser, the lib, and the server — it is the single source of film identity. Keep parsing and scoring logic out of components.

Two runtimes share the same backend code:
- **Local dev**: `server/index.js` (Express) — vite proxies `/api` to :3001.
- **Production (Vercel)**: `api/*.js` serverless functions.
Both are thin adapters over **`server/handlers.js`**, which owns validation, per-IP rate limiting, the profile cache, and the image proxy. Change behavior there, never in the adapters. **Known, deliberate limit**: cache + rate-limit counters are per-instance memory Maps (documented in README) — do not add a paid store for this.

Data flows in one direction through these layers:

1. **`src/lib/loadProfile.js`** — the single, source-agnostic entry point. `loadProfile(source)` always returns the same normalized `Profile` shape regardless of input: `source.type` is `zip` / `csv` (parsed locally) or `public` (fetched from `/api/profile/:username`, then the serialized film array is rebuilt into the `Map`). The engine and UI never know the origin. Do not bypass it.

2. **`src/lib/parseLetterboxd.js`** — turns a Letterboxd `.zip` (or loose CSVs) into a `Profile`. Merges `ratings.csv`, `watched.csv`, `diary.csv`, `likes/films.csv`, and `profile.csv` into a single `Map` keyed by **`name + year`** (`filmKey()`), the only stable film identity across files. A separate `uriIndex` (URI → film) is built only from files that expose the *film* URI, and is used to resolve favorites. Favorites come from the `Favorite Films` column of `profile.csv` (a quoted, comma-separated list of film URLs).

3. **`src/lib/compatibility.js`** — `computeCompatibility(profileA, profileB)` returns the full result object the dashboard renders. All functions are pure (Profiles in → plain object out), so they are unit-testable without React. It compares two profiles by their `Map` keys (`name+year`), which is exactly why CSV-vs-scrape works: both sources produce identical keys via `filmKey`.

4. **TMDB enrichment (progressive, optional)** — after the dashboard renders, `App.jsx` fires `enrichResult(result)` (`src/lib/enrich.js`): it picks ≤ 250 films (displayed lists first, then best co-rated common films; `wantCredits` for people lookups, server caps credits at 120) and POSTs to `/api/enrich`. `server/tmdb.js` does the TMDB calls (1 search/film + 1 credits call if asked; no `primary_release_year` filter — see gotchas). Credits return `directors` and `cast` (top 6) as `{name, profilePath}` objects — the UI shows faces, not name lists. The client gets back a `Map filmKey -> {posterPath, genreIds, directors, cast…}` (`enrichMap`) that flows into components for posters, and into **`src/lib/insights.js`** (pure: commonFilms + enrichMap → genre/director/actor stats). Genre id → French label + emoji mappings live in `src/lib/tmdbGenres.js`. Everything must degrade gracefully when `enrichMap` is null.

**`server/scrapeLetterboxd.js`** — scrapes a public profile into the serializable Profile shape. Films come from `/{user}/films/` (paginated, with ratings), likes from `/{user}/likes/films/`, favorites from the profile page `#favourites` section. Each film is a `LazyPoster` React component carrying `data-item-full-display-name="Title (Year)"` + `data-item-slug`; ratings live in a sibling `.poster-viewingdata[data-item-uid]` with a `rated-N` class (N/2 stars), joined to the film by the shared `film:ID` uid.

`App.jsx` holds the only app state (upload screen vs. results, enrichMap, shareUrl) and wires layer 1 → layer 3 → `ResultsDashboard`. It also handles the shareable URL `/?a=<user>&b=<user>` (auto-launches a public/public compare on load; never written for CSV sources — privacy).

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

`film.date` = most recent activity date (ISO). CSV fills it from the various `Date`/`Watched Date` columns; scrape leaves it null but inserts films in watch-date order (it scrapes `/films/by/date/`), so Map insertion order = recency. `computeCompatibility` uses this for `recentLoved` (recent 4.5★+/liked films — sort by `date` if present, else keep insertion order). It also returns `recommendations` (each side's gems — rating≥4 or liked — the other hasn't watched, top 5), `taste.ratingBias` (signed mean of `ratingA - ratingB`; positive ⇒ A rates more generously), **`commonFilms`** (all films watched by both, with both ratings/likes — the base for TMDB insights), and **`decades`** (`{a, b}` histograms by release decade + `bestTogether`, the decade with the best joint mean over ≥ 5 co-rated films — computed from Letterboxd years, no TMDB needed). `result.profiles.{a,b}` carry `username`/`profileUrl`/`avatarUrl`/`watchedCount` for `ProfileBadge` and the share card.

**Member search** (`server/searchMembers.js`, `GET /api/search/:query`) uses Letterboxd's official `api.letterboxd.com/api/v0/search` — it answers member queries WITHOUT auth (the rest of that API needs a key). Used only for the autocomplete in the public-profile input. Favorite posters are fetched **early** in `scrapeProfile` (right after the profile page, before the heavy pagination) because the IP gets rate-limited after ~40 page requests; they're cosmetic so failure is tolerated (single attempt, no retry).

A film counts as "watched" if `watched || rating != null || liked` (see `isWatched` in compatibility.js).

`computeCompatibility` iterates film Map **keys** (which are `name+year`, not URLs). When building result objects it must expose the real `film.uri` for links — never the key. The `uri` field on `ratedPairs`/`lovedInCommon` results comes from `fa.uri ?? fb.uri` for this reason.

### Share card & image proxy

`src/lib/shareCard.js` draws the 1080×1350 PNG in a canvas (framework-free, but DOM: fonts + images). Poster/avatar hosts don't send CORS headers, so every image goes through **`GET /api/img?u=<url>`** (strict https + hostname allowlist in `handlers.js`: `a.ltrbxd.com`, `s.ltrbxd.com`, `image.tmdb.org`, `secure.gravatar.com`) — otherwise the canvas is tainted and `toBlob` throws. Never turn that proxy into an open relay.

### Design system (Tailwind)

Tokens in `tailwind.config.js`: `night/well/card/line` surfaces, `ink` (warm cream text), `mut/faint` secondary text, and the Letterboxd trio as fixed identity colors — **A = green, B = blue, shared/accent = orange** (never reassign). Chart fills use the darkened `greenfill/bluefill/orangefill` variants (validated for lightness/CVD/contrast on the dark surface). Fonts: Fraunces (display serif) + Archivo (UI). Text always wears ink/mut/faint tokens, never a series color.

## Deployment (Vercel Hobby)

`vercel.json`: framework vite, region cdg1, `maxDuration: 300` on `api/**` (Fluid compute). The scraper self-limits before that via `SCRAPE_BUDGET_MS` (default 270 s) and throws a clear `TOO_LARGE` error instead of letting the platform time out. Verified on the real runtime: **curl 8.x is present** (Amazon Linux) and letterboxd.com answers Vercel IPs; if curl ever disappears, the scraper throws `CURL_MISSING` (501) with a user-readable message. Set `TMDB_API_KEY` in Vercel env vars. Static OG image: `public/og.png` (1200×630, regenerate with `scripts/screenshot.mjs` if the branding changes).

## Things that will bite you

- **`diary.csv`'s `Letterboxd URI` is the diary-entry URL, NOT the film URL** (confirmed on real data — the same film has a different URI in `diary.csv` than in `watched`/`ratings`/`likes`). This is exactly why the canonical key is `name+year`, not URI. `ingestDiary` passes `isFilmUri=false` so the diary URI never pollutes the film URI or `uriIndex`. Don't "simplify" this back to URI keying.
- **CSV parsing is deliberately tolerant.** URIs are `boxd.it` short links; favorites are matched by exact URI then by trailing slug. Everything degrades gracefully if a file/column is missing. Be careful editing `parseFavorites` / `pick` / `findEntry`.
- **Score formula** (compatibility.js): `tasteScore` ("accord de notes") = mean of rating closeness (`100 − meanDiff × 25`) and Pearson mapped onto [0,100] — the blend fixes Pearson's blind spot on near-constant raters and closeness's blindness to taste direction. `overlapScore` ("recoupement") = Ochiai `√(pctOfA × pctOfB)`, fairer than Jaccard when library sizes differ a lot. Weighting shifts based on how many films were co-rated (70/30, then 40/60, then overlap-only). Tune the constants at the top of the file (`LOVED_THRESHOLD`, `DIVISIVE_THRESHOLD`, `MIN_RATINGS_FOR_TASTE`). The README documents the exact weights — keep them in sync. The UI never says "Pearson" or "Jaccard" — plain language only.
- **TMDB matching must NOT use `primary_release_year`**: Letterboxd years differ from TMDB's by ±1 around festival releases, and the year filter surfaces obscure homonyms ("300" → an unknown 2006 film instead of the 2007 Snyder). `bestMatch` searches without a year filter, keeps candidates within ±1 year, and picks by popularity (×2 bonus for exact year). Test with `300 (2006)`, `Crash (2004)`, both `Suspiria`s.
- **The UI must survive `enrichMap == null`** (no TMDB key, network failure, CSV-only offline use): posters fall back to text placeholders, `InsightsSection` hides itself. Decades come from `compatibility.js` and must never depend on TMDB.

### Scraper gotchas (`server/scrapeLetterboxd.js`)
- **Node's `fetch` (undici) gets 403 from Letterboxd** (Cloudflare TLS-fingerprint block) even with browser headers. We shell out to **`curl`** instead (present on Win10+/macOS/Linux/Vercel). Don't "modernize" this back to `fetch`/axios — they share Node's TLS fingerprint and will be blocked too. (TMDB, by contrast, is fine with plain `fetch`.)
- **Rate-limiting (403/429) is real.** Concurrency is capped at 3, sections are fetched sequentially, and `fetchHtml` retries with exponential backoff. Raising these will get the scraper blocked mid-run.
- **Two pagination styles.** The films page has numbered pages (`.paginate-pages`) → fast parallel fetch. The likes page only has next/prev → sequential "until a page has < 72 posters". `numberedLastPage` must read ONLY `.paginate-pages a` (not the next/prev link, whose href is `/page/2/` and would falsely cap the total at 2).
- **`diary.csv` URI ≠ film URI** (see above) and **scrape URI (`letterboxd.com/film/slug`) ≠ CSV URI (`boxd.it/...`)**. Never match films across sources by URI — always by `filmKey(name, year)`. This is why shared-favorites in compatibility.js compares names, not URIs.
- **Time budget**: every page fetch checks the `deadline` (set from `SCRAPE_BUDGET_MS` in `scrapeProfile`). A budget overrun throws `TOO_LARGE` — it must propagate (App shows the message), except that non-budget failures on the likes section stay tolerated.
