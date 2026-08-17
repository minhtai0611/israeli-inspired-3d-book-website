# Sifria · Ánh Sáng Cổ Thư (סִפְרִיָּה)

[![CI](https://github.com/minhtai0611/israeli-inspired-3d-book-website/actions/workflows/ci.yml/badge.svg)](https://github.com/minhtai0611/israeli-inspired-3d-book-website/actions/workflows/ci.yml)

Sifria is a reading site for classical and contemporary Israeli/Jewish texts — Torah, Tanakh,
Mishnah, Talmud, Kabbalah, Psalms, and more — with a Vietnamese-language interface and an
Israeli-inspired, animated 3D visual theme.

All book text (Hebrew + English) is fetched live from the open [Sefaria API](https://developers.sefaria.org).
Nothing is stored or fabricated locally — only UI copy and short category/book descriptions are
localized into Vietnamese. **This is not a full-text Vietnamese translation** — the source text
itself is Hebrew/English, sourced from Sefaria as-is.

## Features

- Browse the full Sefaria catalog by category at `/library` and `/library/[category]`
  (server-side filter/sort/pagination via URL params — works with JavaScript disabled)
- Search books by English/Hebrew/Vietnamese name at `/search`, with diacritic-insensitive
  Vietnamese matching ("thi thien" finds "Thi Thiên")
- Reader controls at `/read/[book]/[chapter]`: font size, line spacing, Hebrew/English/both
  toggle, per-verse copy-link (`#v12`-style deep links), all persisted per-browser
- Correctly handles Sefaria's three chapter-addressing schemes (plain integer, Talmud daf, and
  named complex sections like Zohar) — see `docs/adr/0001-schema-resolver.md`
- "Continue reading" on the home page, from the same per-browser history
- Anonymous reading progress/history synced to Postgres (`POST /api/progress/sync`, keyed by a
  client-generated UUID in `src/lib/client-id.ts`) alongside the existing localStorage state —
  non-blocking, best-effort
- Chapter text is mirrored into a Postgres cache on read (stale-while-revalidate, 7-day window —
  see `getText()` in `src/lib/sefaria.ts`) so a repeat chapter view skips the Sefaria round-trip
- Bilingual full-text verse search at `/search` (mode toggle next to the existing book-title
  search) — searches Sefaria's text corpus directly, not just titles/metadata
- Click a verse number to open a drawer of classical commentary/Targum for that verse
  (`CommentaryDrawer.tsx`), capped and metadata-first to stay fast even on heavily-annotated verses
- Dynamic OG images, sitemap, BreadcrumbList JSON-LD for social sharing/SEO
- `lang="he"`/`lang="en"` on all bilingual text, WCAG AA contrast, reduced-motion and
  high-contrast media query support, skip-to-content link, visible focus outlines — see
  `docs/a11y.md`
- Security headers (CSP, HSTS, X-Frame-Options, etc.) — see `next.config.ts`
- Opt-in interactive 3D Torah scroll on the home hero (`torah-scroll-3d.tsx`, desktop only,
  lazy-loaded via `next/dynamic({ ssr: false })`) — the default pure-CSS orbit stays 0 added
  bytes until a user explicitly toggles it on; hidden under `prefers-reduced-motion`
- Torah cantillation audio player in the reader (`AudioCantillationBar.tsx`) — recorded
  PocketTorah trope recordings (via Sefaria's `related_api`, Torah-only), with a 30-day Postgres
  cache (`audio_cantillation_cache`) so the multi-MB upstream payload is only fetched once per
  ref, plus verse-by-verse highlight synced to playback position
- ~100-term Hebrew/Jewish glossary (`glossary.ts`) auto-detected and wrapped with a
  `GlossaryTooltip` wherever it appears in category/book descriptions — hover/focus/click to
  open, zero layout shift
- "Ánh Sáng Hôm Nay" home page widget: today's Daf Yomi and this week's Parashat HaShavua,
  each linking straight into `/read/[book]/[chapter]`, from Sefaria's calendars API
  (`getGlobalCalendars()`, 24h cache)

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL — `/library`, `/library/[category]`, and
  `/search` read the catalog from here (falling back to a live Sefaria fetch if the DB is
  unreachable); `/read`'s chapter text is mirrored into a cache on read; reading progress/history
  sync here anonymously. See `docs/db-sync.md`. `/book`'s book table-of-contents still reads
  Sefaria directly per request.
- Content: [Sefaria](https://www.sefaria.org) Open API

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        U[User]
    end
    subgraph Vercel["Vercel (Next.js 16 App Router)"]
        Home["/ (GlobalReadingCalendar widget)"]
        Browse["/library, /library/[category], /search"]
        Read["/book/[book], /read/[book]/[chapter] (+ AudioCantillationBar)"]
        ProgressAPI["/api/progress/sync"]
        LinksAPI["/api/verse-links"]
        AudioAPI["/api/audio-cantillation"]
        Cron["/api/cron/sync (weekly, CRON_SECRET)"]
        Health["/api/health"]
    end
    subgraph Neon["Neon Postgres"]
        DB[(categories / books / book_aliases)]
        Cache[(chapter_text_cache)]
        AudioCache[(audio_cantillation_cache, 30d)]
        Reader[(reading_history / reading_progress)]
    end
    Sefaria["Sefaria Open API"]
    PocketTorah["raw.githubusercontent.com (PocketTorah mp3s)"]

    U --> Home
    U --> Browse
    U --> Read
    Home -- "today's calendar, 24h cache" --> Sefaria
    Browse -- "catalog read (fallback: live fetch)" --> DB
    Read -- "book TOC, always live" --> Sefaria
    Read -- "chapter text: cache-first, SWR 7d" --> Cache
    Read -. "cache miss/expired" .-> Sefaria
    Read -- "commentary/Targum links" --> LinksAPI
    LinksAPI -- "metadata + per-link text (cached)" --> Sefaria
    Read -- "cantillation clips" --> AudioAPI
    AudioAPI -- "cache-first, SWR 30d" --> AudioCache
    AudioAPI -. "cache miss (related_api, trimmed to media[])" .-> Sefaria
    Read -. "browser plays the mp3 directly" .-> PocketTorah
    Read -- "non-blocking, on chapter view" --> ProgressAPI
    ProgressAPI -- "upsert/insert" --> Reader
    Cron -- "fast metadata-only refresh" --> Sefaria
    Cron -- "upsert" --> DB
    Health -- "lastSync, readableCount" --> DB
```

`npm run sync:sefaria` (manual CLI, not on Vercel — see `docs/db-sync.md`) runs the slow full
catalog sync with per-book readability verification (~26 min for 6,598 books); the Vercel Cron
above only does the fast metadata-only refresh, since Vercel Functions can't run that long.

## Getting started

### Prerequisites

- Node.js 22+ (matches CI — see `.github/workflows/ci.yml`)
- A PostgreSQL database (required to boot at all — see `src/db/index.ts`; browsing/search read
  from it with a live-Sefaria fallback, see `docs/db-sync.md`)

### Setup

```bash
npm install
```

Create a `.env` file with:

```
DATABASE_URL=postgresql://user:password@localhost:5432/app_db
# In production (Vercel + Neon), this MUST be Neon's pooled connection string
# (the "-pooler" host, PgBouncer on port 6543) — src/db/index.ts opens a plain
# node-postgres Pool, and Vercel Functions can exhaust Neon's connection limit
# fast if pointed at the direct (non-pooled) endpoint instead.

# Optional — only needed if you're serving from a custom domain. Falls back to the
# Vercel deployment URL, then http://localhost:3000. See src/lib/site.ts.
NEXT_PUBLIC_SITE_URL=https://your-domain.example

# Required in production only, to authorize the weekly Vercel Cron re-sync
# (see vercel.json + src/app/api/cron/sync/route.ts). Not needed locally.
CRON_SECRET=
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command              | Description                                          |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Start the local dev server                           |
| `npm run build`       | Production build                                     |
| `npm run start`       | Run the production build                             |
| `npm run lint`        | Lint with ESLint                                      |
| `npm run typecheck`   | Type-check with `tsc --noEmit`                       |
| `npm run test`        | Run the Vitest unit suite                             |
| `npm run test:cov`    | Run the unit suite with coverage                      |
| `npm run test:e2e`    | Run the Playwright E2E suite (`tests/e2e/`) against a local production build |
| `npm run audit:coverage` | Sample the catalog and measure real book readability (see `scripts/audit-coverage.ts`) |
| `npm run db:push`     | Push `src/db/schema.ts` to `DATABASE_URL`             |
| `npm run sync:sefaria`| Full catalog sync + per-book readability verification — see `docs/db-sync.md` |

CI runs lint, typecheck, the unit suite, a production-dependency security audit, and a build on
every push/PR — see `.github/workflows/ci.yml`. A weekly Vercel Cron (`vercel.json`) hits
`/api/cron/sync` for a fast metadata-only refresh between full syncs. E2E (`npm run test:e2e`) and
Lighthouse (`npx lhci autorun`, config in `.lighthouserc.json`) are run manually, not in CI — both
need a full production build + server running locally.

## Project structure

```
src/
  app/
    page.tsx                    Home
    library/                    Library: category listing (page.tsx, [category]/ — server-side
                                 filter/sort/pagination via searchParams)
    search/                     Search
    book/[book]/                Book table of contents (+ generateStaticParams for popular books)
    read/[book]/[chapter]/      Reader (+ generateStaticParams for popular chapters, opengraph-image.tsx)
    api/health/, api/cron/sync/ DB health check; weekly catalog metadata refresh
    api/progress/sync/          Upserts reading_progress + inserts reading_history (client-id keyed)
    api/verse-links/            Server proxy for getVerseLinks() — CommentaryDrawer fetches through this
    api/audio-cantillation/     Server proxy for getAudioCantillation() — AudioCantillationBar fetches through this
    robots.ts, sitemap.ts, opengraph-image.tsx, manifest.ts, layout.tsx
                                 All derive their URL from lib/site.ts
  components/
    reader/                     ReaderView (controls, verse copy-link, commentary trigger),
                                 CommentaryDrawer (per-verse commentary/Targum, portalled to
                                 document.body), ContinueReading, AudioCantillationBar
                                 (cantillation playback + verse highlight)
    home/                       GlobalReadingCalendar (Daf Yomi / Parashat HaShavua widget)
    3d/                         torah-scroll-3d.tsx — opt-in interactive 3D scroll, lazy-loaded
                                 from HeroOrbit.tsx via next/dynamic({ ssr: false })
    GlossaryTooltip.tsx, GlossaryText.tsx
                                 Hover/focus/click term tooltip + auto-wrap-matching-terms helper
    SearchForm.tsx, SiteHeader.tsx, SiteFooter.tsx, HeroOrbit.tsx, HebrewMarquee.tsx
  lib/
    sefaria.ts                  Sefaria API client: index/book/text fetching (with a Postgres SWR
                                 cache), searchVerses (full-text), getVerseLinks (commentary/Targum),
                                 getAudioCantillation (PocketTorah trope clips via related_api, with
                                 its own Postgres SWR cache), getGlobalCalendars +
                                 calendarLinkTarget (Daf Yomi / Parashat HaShavua → route target),
                                 HTML cleanup; retries transient network errors AND 429/5xx upstream
                                 responses so a one-off Sefaria blip can't get baked into a page's
                                 ISR cache as a stale error
    glossary.ts                  ~100-term Hebrew/Jewish glossary + the regex used to auto-match
                                 terms in free text (see GlossaryText.tsx)
    schema-resolver.ts          Resolves Sefaria's 3 address schemes (integer/Talmud daf/complex)
    library.ts                  Shared index-flattening/grouping/search helpers (live-fetch source)
    library-db.ts               Same FlatBook[] shape, sourced from Postgres (browsing/search)
    sync-catalog.ts             Shared sync logic: fast metadata-only vs. slow full-verification
    client-id.ts                Anonymous per-browser client UUID (localStorage) for reading_history/
                                 reading_progress
    hebrew-numeral.ts           Hebrew numeral formatting (chapter/daf labels)
    popular-books.ts            Torah + Psalms + 5 Megillot + Pirkei Avot — the prerendered set
    reader-storage.ts           localStorage-backed reader prefs + history (useSyncExternalStore)
    site.ts                     SITE_URL — single source of truth for every canonical/robots/
                                 sitemap/JSON-LD URL
    vi.ts                       Vietnamese display names/descriptions for categories & books
  db/
    schema.ts                   categories/books/book_aliases/sync_runs/reading_history/
                                 reading_progress/bookmarks/chapter_text_cache/
                                 audio_cantillation_cache
scripts/
  audit-coverage.ts             Samples the catalog and measures real book readability
  sync-sefaria-index.ts         CLI wrapper around sync-catalog.ts's full verification sync
tests/
  unit/                         Vitest unit tests
  e2e/                           Playwright E2E tests (reader.spec.ts) — see playwright.config.ts
docs/
  db-sync.md                    How the two sync modes work, what's DB-backed vs. still live
  a11y.md                       Accessibility checklist — what was checked and how
  adr/                           Architecture Decision Records (0001-schema-resolver,
                                 0002-postgres-mirror, 0003-server-side-pagination)
```

## Measured results

Real numbers from this project's 2026 remediation effort — not estimates. Methodology and full
context for each row is in the linked ADR/doc. Rows marked "live, 2026-08-17" were re-measured
against the production URL that date, using `scripts/measure.sh` (HTTP-level metrics) and
`scripts/audit-coverage.ts` (readability, same fixed seed as the original remediation so results are
directly comparable, not resampled). TTFB is graded per web.dev's own published thresholds
(Good ≤ 800 ms, Needs Improvement ≤ 1800 ms, Poor > 1800 ms — [web.dev/articles/ttfb](https://web.dev/articles/ttfb)),
and reported at p75 — the percentile Core Web Vitals field assessment itself uses
([web.dev/defining-core-web-vitals-thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)) — from
n=20 sequential requests per route, a RUM-style minimum for a stable tail percentile. Real-browser
metrics (LCP, CLS, INP) require an actual rendering engine (Lighthouse/CrUX), not curl, and are out
of scope for this pass — see `.lighthouserc.json` (`npx lhci autorun` against a local production
build) for those; they weren't re-run here. The full production catalog sync (6,598+ books, ~26 min,
writes to the production DB) is a mutating, long-running job — also not re-run in this pass; ask
before triggering it.

| Metric | Before | After | Source |
| --- | --- | --- | --- |
| Book readability (200-title sample, seed 20260725, real click-through) | 53.5% | 97.0% | `docs/coverage-report.md`, reverified live 2026-08-17 |
| Production catalog sync (6,602 books as of 2026-08-17, live) | — | 98.45% verified readable | `docs/db-sync.md` (last full sync run, not re-run this pass) |
| `/library/Halakhah` raw HTML (2,169-book category) | 555.9 KB | 75.7 KB | `docs/adr/0003-server-side-pagination.md`, reverified live 2026-08-17 |
| Local TTFB, p50 | 640 ms | 4.9 ms | `scripts/measure.sh` baseline vs. after Phase 4 caching |
| Lighthouse — `/` (Performance / A11y / Best Practices / SEO) | — | 77 / 98 / 100 / 100 | `.lighthouserc.json` |
| Lighthouse — `/library` | — | 84 / 100 / 100 / 100 | `.lighthouserc.json` |
| Lighthouse — `/read/Genesis/1` | — | 88 / 98 / 100 / 100 | `.lighthouserc.json` |

The Performance scores (77–88) are the main known gap — not addressed by this remediation, which
focused on correctness (readability, 404 semantics), data volume, and SEO/a11y. Likely next targets
are Sefaria fetch latency on cache-miss and unoptimized image/font loading, but that wasn't profiled
here.

The readability re-check found **6 titles newly broken** since the original 98.5% baseline (5 with a
loading `/book` page but no extractable "Đọc từ đầu" link, 1 with the `/book` page itself 404ing —
see `docs/coverage-report.md` for the exact titles). Not investigated further in this pass; flagged
for a follow-up.

### Production TTFB by route/page type (live, 2026-08-17)

One route per Sefaria address-kind (`docs/adr/0001-schema-resolver.md`: integer chapters, Talmud
daf, complex-schema sections), plus a large (2,169-book) and a minimal (1-book) category, since page
cost scales with catalog data volume as much as route type. Full raw output in
`docs/metrics-raw.txt` (gitignored, regenerate with `scripts/measure.sh`).

| Route (page type) | p50 | p75 (graded) | p95 | Cache |
| --- | --- | --- | --- | --- |
| `/` (home) | 239 ms | 259 ms — Good | 804 ms | ISR HIT |
| `/library` (catalog index) | 295 ms | 316 ms — Good | 1162 ms | ISR HIT |
| `/library/Halakhah` (2,169-book category) | 805 ms | 868 ms — Needs Improvement | 993 ms | dynamic (MISS) |
| `/library/Musar` (1-book category) | 811 ms | 822 ms — Needs Improvement | 1022 ms | dynamic (MISS) |
| `/search?q=...` | 746 ms | 759 ms — Good | 951 ms | dynamic (MISS) |
| `/book/Genesis` (integer-address book) | 228 ms | 234 ms — Good | 1068 ms | ISR HIT |
| `/book/Berakhot` (Talmud daf book) | 244 ms | 250 ms — Good | 258 ms | ISR HIT |
| `/book/Zohar` (complex-schema book) | 224 ms | 238 ms — Good | 266 ms | ISR HIT |
| `/read/Genesis/1` (integer chapter) | 221 ms | 226 ms — Good | 1228 ms | ISR HIT |
| `/read/Berakhot/2a` (Talmud daf) | 222 ms | 224 ms — Good | 432 ms | ISR HIT |
| `/read/Zohar/...` (complex section) | 223 ms | 235 ms — Good | 493 ms | ISR HIT |
| `/api/health` (API route) | 421 ms | 430 ms — Good | 609 ms | dynamic (MISS) |

`/library/[category]` and `/search` grade "Needs Improvement" — expected, not a regression: both are
intentionally dynamic, server-rendered per request for URL-param filter/sort/pagination (see
Features above; `X-Vercel-Cache: MISS` on every one of these confirms it), unlike `/book` and `/read`,
which are ISR-cached after their first render. `/library/Halakhah` and the 1-book `/library/Musar`
land at nearly the same p75 despite the 2,169x difference in catalog size, meaning cost here is
dominated by per-request DB/render overhead, not category size — consistent with the raw-HTML-size
finding above (`/library/Halakhah` no longer scales with row count either, per ADR 0003).

## Deployment

Hosted on [Vercel](https://vercel.com) with [Neon](https://neon.tech) Postgres. Pushes to
`master` deploy to production automatically. Set `NEXT_PUBLIC_SITE_URL` in the Vercel project's
environment variables if serving from a custom domain — otherwise the site correctly falls back
to the assigned `*.vercel.app` URL (see `src/lib/site.ts`).

## Content attribution

Hebrew text is the Masoretic text (CC-BY-SA); English translations and book metadata are served
via the [Sefaria](https://www.sefaria.org) Open API under their respective licenses. Sifria does
not modify or reinterpret the underlying text — see the `/about` page for more on the
project's approach.

Torah cantillation audio (played by `AudioCantillationBar`) is served via Sefaria's `related_api`,
sourced from the [PocketTorah](http://www.pockettorah.com) project (Ashkenazi trope, Avery-Binder
style) under CC-BY-SA — attribution shown inline in the audio player itself.

## License

Code: MIT (see `LICENSE`).

The text content served by this site is **not** owned by this project:
- Hebrew source text is served via Sefaria under its own licensing (typically CC-BY-SA).
- English translations and metadata are served via the [Sefaria](https://www.sefaria.org) Open
  API under their respective per-work licenses.

Sifria does not modify or reinterpret the underlying source text.
