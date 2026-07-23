# Sifria Production Hardening — Changelog

Executed per `CLAUDECODE_SIFRIA_end_to_end_fix_plan.md`. Phases below match that plan's
priority order (P0 product-truth/SEO first, then discoverability/DB/reader/a11y/security).

## Phase A — Site URL truth + SEO/JSON-LD (P0)

**What:** Added `src/lib/site.ts` as the single `SITE_URL` source of truth. Fixed
`layout.tsx`, `robots.ts`, `sitemap.ts` to derive from it instead of hardcoding
`https://sifria.app` — a domain the project doesn't actually use (it's deployed on a
`*.vercel.app` URL). Removed the `SearchAction` JSON-LD entry, since `/tim-kiem` did not
exist yet. Fixed copy in `layout.tsx`, `page.tsx`, `SiteFooter.tsx`, `manifest.ts` that
implied a full Vietnamese-language translation of the source texts — the interface is
Vietnamese, the texts themselves are Hebrew/English from Sefaria.

**Why:** Canonical/robots/sitemap/JSON-LD pointing at a domain the site isn't served from
breaks search-engine verification and social-card previews. A `SearchAction` targeting a
route that 404s is structured-data spam. Overclaiming translation coverage is a product-truth
issue the plan explicitly forbids.

**Bonus (pulled forward from Phase G):** `npm audit` surfaced `next@16.2.6` carrying 2 HIGH
severity advisories (SSRF, cache confusion, DoS — see advisory list in `npm audit` output).
Bumped to `next@16.2.11` (confirmed latest stable via `npm view next dist-tags.latest`) — a
patch-only bump, no breaking changes. This also pulled in fixed `sharp`/`postcss` versions,
but not far enough; forced `postcss@8.5.22` and `sharp@0.35.3` via `package.json` `overrides`
to close the remaining 1 HIGH + 1 MODERATE (both were nested inside `next`'s own bundled
deps, not our direct dependencies).

**Routes affected:** `/`, `/robots.txt`, `/sitemap.xml`

## Phase B — Real search (P0/P1)

**What:** Built `/tim-kiem`: searches the Sefaria index by English title, Hebrew title,
category, and Vietnamese display name/blurb (see `searchBooks` in `src/lib/library.ts`).
Added a `SearchForm` component wired into `SiteHeader` (desktop) and the mobile nav strip.
Restored the `SearchAction` JSON-LD once the route was verified working.

**Why:** The plan requires either a real search route or no `SearchAction` at all — never a
JSON-LD promise pointing at a 404.

**Routes affected:** `/tim-kiem` (new), `/` (JSON-LD)

## Phase C — Library discoverability (P1)

**What:** Extracted `flattenBooks`/`groupByCategory`/`sortCategories` out of
`thu-vien/page.tsx` into shared `src/lib/library.ts`. Added `/thu-vien/[category]`, a full
per-category listing with client-side filter, A–Z sort, and load-more
(`CategoryBrowser.tsx`) — no page size cap. `/thu-vien`'s "…N more" text is now a link there
instead of a dead end. Rewrote `sitemap.ts` to enumerate every real book/category from the
Sefaria index instead of 24 hardcoded titles.

**Why:** `/thu-vien` capped every category at 24 items with no way to see the rest — the
plan calls this out by name as a dead end to fix.

**Measured effect:** sitemap went from 24 URLs to 6,615 (verified via `curl .../sitemap.xml
| grep -c '<loc>'` against a local production build).

**Routes affected:** `/thu-vien`, `/thu-vien/[category]` (new), `/sitemap.xml`

## Phase D — DB schema + sync foundation (P1)

**What:** Replaced the placeholder `src/db/schema.ts` with real tables: `categories`,
`books`, `book_aliases`, `sync_runs`, plus anonymous (no-login) `reading_history` /
`reading_progress` / `bookmarks`. Added `scripts/sync-sefaria-index.ts` (upserts from the
live Sefaria index, idempotent on `title`/`key`) and `docs/db-sync.md` explaining what's
wired up vs. foundation-only.

**Why:** The Sefaria `/index` fetch is ~5.3MB — over Next's 2MB data-cache limit (visible in
every `npm run build` log as `"items over 2MB can not be cached"`). A DB mirror is the fix;
this phase lays the schema/sync groundwork for it.

**Verification:** No live Postgres credentials were available in this environment. Verified
via `npx drizzle-kit generate`, which produced a real migration
(`drizzle/0000_damp_the_anarchist.sql`, 7 tables, correct FKs) without needing a live DB
connection, plus `tsc --noEmit` passing on the sync script. **Not run end-to-end against a
live database, and no page currently reads from these tables** — this is a foundation, not a
cutover; the live UI still reads Sefaria directly.

**Routes affected:** none directly (schema/scripts only)

## Phase E — Reader controls + reading history (P1)

**What:** `ReaderView` (client component) replaces the static verse list in
`/doc/[book]/[chapter]`: font-size (A−/A+), line-spacing cycle, Hebrew/English/both toggle,
per-verse copy-link button (existing `#v{n}` anchors made discoverable/actionable). All
prefs persist to `localStorage`. `ContinueReading` widget on the home page shows the last
visited chapters from the same store. Both use `useSyncExternalStore` rather than an
effect-plus-`setState` read of localStorage — the first draft used the latter and
`eslint-config-next`'s `react-hooks/set-state-in-effect` rule correctly failed the lint step;
fixed properly instead of suppressed.

**Why:** The plan asks for reader controls and a retention foundation. With no live database
available to verify against, a `localStorage`-backed implementation is real and testable
today; the DB tables from Phase D exist for a future sync of the same data.

**Routes affected:** `/doc/[book]/[chapter]`, `/`

## Phase F — Accessibility (P1)

**What:** `@media (prefers-reduced-motion: reduce)` block in `globals.css` disabling all
keyframe animations and smooth scroll; skip-to-content link (`.skip-link`) plus
`id="main-content"` on `<main>`; global `:focus-visible` outline; removed two `outline-none`
instances (in `SearchForm`, `CategoryBrowser`) that would have defeated it.

**Why:** The plan mandates reduced-motion support and a skip link as non-negotiable a11y
minimums; the site had neither, and had two spots that actively suppressed focus indicators.

**Verification:** confirmed both the media query and `.skip-link` rule present in the built
CSS output.

**Routes affected:** global (`layout.tsx`, `globals.css`)

## Phase G — Security headers (P1)

**What:** `next.config.ts` now sets `Content-Security-Policy`, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`
on every route.

**Why:** None of these were set before. The CSP allows `'unsafe-inline'` for scripts/styles
(required by the JSON-LD `<script>` tags and Next's own inline hydration data — there's no
user-controlled content reflected into them) rather than building a full nonce-based CSP via
middleware, which the plan treats as a "consider" item, not a hard requirement.

**Verification:** `curl -I` against a local production build confirms all six headers are
served; reviewed every external URL in `src/` (`Grep -r "https://"`) and confirmed each is
either a server-side API fetch or a plain `<a href>` link — nothing the CSP would block.

**Routes affected:** global (`next.config.ts`)

## Phase H — Validation + docs

**What:** Final `npm install` / `npm run lint` / `npm run typecheck` / `npm run build` pass
(all green — see below). Updated `README.md` to describe the new routes/scripts/structure.
Wrote this changelog. Kept `EXECUTION_PROGRESS.md` / `RECOVERY_STATE.md` current throughout.

**Bug found during Phase H's manual route check:** `curl /sach/NotARealBook` returned `200`
instead of `404`. Root cause: Sefaria's API returns HTTP **200** with a body of
`{"error": "No book named '...'"}` for unknown titles/refs (confirmed directly —
`curl https://www.sefaria.org/api/v2/raw/index/NotARealBook` and
`.../api/texts/NotARealBook_1` both return `200` with an `error` field, not a 404 status).
`sefariaFetch()` in `src/lib/sefaria.ts` only checked `res.ok`, so this error-shaped 200
sailed through as a "successful" response — `/sach/[book]` and `/doc/[book]/[chapter]` would
render a thin, mostly-empty page for **any** misspelled or bogus book slug instead of 404ing,
which is both a broken-UX and an SEO problem (indexable near-duplicate junk pages at
unlimited URLs). Fixed at the single choke point: `sefariaFetch` now inspects the parsed
JSON body for an `error` field and throws if present, so the `notFound()`/try-catch handling
already present at every call site (verified: `getIndex`, `getText`, `getBookIndex` are used
by 7 routes, all of which already catch and either 404 or show a graceful error state) starts
working correctly. Verified real Genesis responses have no `error` key (no false-positive
risk), then confirmed `/sach/NotARealBook` and `/doc/NotARealBook/1` now correctly return 404
against a rebuilt production server, with all previously-passing routes still 200.

## Validation summary

| Check | Result |
| --- | --- |
| `npm install` | pass (389 packages; see dependency note below) |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run build` | pass (all 9 routes compile; `/thu-vien`, `/`, `/sitemap.xml` static; `/tim-kiem`, `/thu-vien/[category]`, `/sach/[book]`, `/doc/[book]/[chapter]`, `/api/health` dynamic) |
| Manual route checks | `/`, `/thu-vien`, `/thu-vien/Tanakh`, `/sach/Genesis`, `/doc/Genesis/1`, `/tim-kiem?q=Genesis`, `/tim-kiem?q=Thi%20Thiên`, `/ve-chung-toi`, `/robots.txt`, `/sitemap.xml` all verified 200 with correct content against a local production server; `/sach/NotARealBook` and `/doc/NotARealBook/1` verified 404 (see Phase H bugfix above) |
| `npm audit` | 0 HIGH (was 2), 4 MODERATE remaining (`esbuild` via `drizzle-kit`'s dev-only toolchain — no non-breaking upstream fix exists; the audit's own suggested "fix" is a `drizzle-kit` downgrade to `0.18.1`, a regression, not applied) |

## Known limitations

- **No live Postgres available in this environment.** Phase D's schema/sync script are
  typechecked and schema-verified (`drizzle-kit generate`), but never run against a real
  database. `/thu-vien`, `/sach`, `/doc`, `/tim-kiem` still read Sefaria live — the DB layer
  is a documented foundation, not a cutover.
- **Reading history/progress is `localStorage`-only** (anonymous, per-browser) — not synced
  to the `reading_history`/`reading_progress` DB tables. There is no login system in this
  app to key server-side retention data by.
- **CSP is not nonce-based** — uses `'unsafe-inline'` for scripts/styles. Acceptable given
  there's no user-controlled content reflected into inline scripts, but a stricter nonce-based
  policy would require adding middleware, which was judged out of scope for what this app
  needs today.
- **4 moderate `npm audit` findings remain**, all the same `esbuild`-via-`drizzle-kit`
  dev-only chain — accepted, no non-breaking fix exists upstream yet.
