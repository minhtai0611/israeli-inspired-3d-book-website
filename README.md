# Sifria · Ánh Sáng Cổ Thư (סִפְרִיָּה)

[![CI](https://github.com/minhtai0611/israeli-inspired-3d-book-website/actions/workflows/ci.yml/badge.svg)](https://github.com/minhtai0611/israeli-inspired-3d-book-website/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A reading site for classical and contemporary Jewish texts — Torah, Tanakh, Mishnah, Talmud,
Kabbalah, Psalms — with a Vietnamese interface and an animated 3D visual theme.

Text (Hebrew + English) is fetched live from the [Sefaria API](https://developers.sefaria.org).
Nothing is stored or fabricated locally; only UI copy and short descriptions are localized into
Vietnamese. **This is not a full-text translation** — the source text itself is Hebrew/English,
served as-is from Sefaria.

## Features

- Browse the full Sefaria catalog by category, with server-side filter/sort/pagination that
  works without JavaScript
- Diacritic-insensitive Vietnamese/English/Hebrew search ("thi thien" finds "Thi Thiên"),
  plus bilingual full-text verse search
- A reader with font size, line spacing, Hebrew/English/both toggle, and per-verse deep links
- Correct handling of Sefaria's three chapter-addressing schemes — plain integer, Talmud daf,
  and named complex sections (Zohar, etc.) — see [ADR 0001](docs/adr/0001-schema-resolver.md)
- Anonymous reading history/progress, synced to Postgres and resumable across visits
- Per-verse commentary and Targum in a slide-out drawer
- Torah cantillation audio playback with synced verse highlighting
- ~100-term glossary of Hebrew/Jewish terms, shown as tooltips throughout
- Today's Daf Yomi and this week's Parashat HaShavua on the home page
- Opt-in 3D Torah scroll on the home hero — desktop only, zero cost until toggled on
- WCAG AA contrast, reduced-motion and high-contrast support, full keyboard navigation
- Dynamic OG images, sitemaps, and structured data for search and social sharing
- Security headers (CSP, HSTS, X-Frame-Options) on every response

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Database | [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL ([Neon](https://neon.tech)) |
| Content | [Sefaria](https://www.sefaria.org) Open API |
| Hosting | [Vercel](https://vercel.com) |

The catalog and search read from Postgres, falling back to a live Sefaria fetch if the database
is unreachable. Chapter text is mirrored into a cache on read. See [`docs/db-sync.md`](docs/db-sync.md).

## Getting started

**Prerequisites:** Node.js 22+, a PostgreSQL database.

```bash
npm install
```

> **If you touch `package.json`,** regenerate the lockfile with the npm version CI uses, not
> whatever's installed locally: `npx npm@10 install --package-lock-only`. CI's Node 22 runner
> bundles npm 10.x, and npm 11 resolves platform-specific optional dependencies (`@esbuild/*`,
> `@emnapi/*`) differently — a lockfile written by npm 11 fails `npm ci` under npm 10 with
> `EUSAGE ... package.json and package-lock.json ... not in sync`, even though nothing is
> actually wrong with your dependencies. This has broken CI three times; see git history for
> `fix(ci): regenerate lockfile ...` commits.

Create a `.env` file:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/app_db
# In production this must be Neon's pooled connection string ("-pooler" host,
# port 6543) — the app opens a plain node-postgres Pool, which can exhaust
# Neon's connection limit fast on a serverless direct connection.

NEXT_PUBLIC_SITE_URL=https://your-domain.example  # optional; falls back to the Vercel URL
CRON_SECRET=                                       # required in production only
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` / `start` | Production build / run it |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run test` / `test:cov` | Vitest unit suite, with coverage |
| `npm run test:e2e` | Playwright suite against a local production build |
| `npm run audit:coverage` | Sample the catalog and measure real book readability |
| `npm run db:push` | Push the schema to `DATABASE_URL` |
| `npm run sync:sefaria` | Full catalog sync with per-book readability verification |

CI runs lint, typecheck, tests, a dependency audit, and a build on every push. A weekly Vercel
Cron job does a fast metadata-only catalog refresh; E2E and Lighthouse run manually — both need a
full production build.

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        U[User]
    end
    subgraph Vercel["Vercel (Next.js 16 App Router)"]
        Home["/ (reading calendar widget)"]
        Browse["/library, /library/[category], /search"]
        Read["/book/[book], /read/[book]/[chapter]"]
        ProgressAPI["/api/progress/sync"]
        LinksAPI["/api/verse-links"]
        AudioAPI["/api/audio-cantillation"]
        Cron["/api/cron/sync (weekly)"]
    end
    subgraph Neon["Neon Postgres"]
        DB[(categories / books)]
        Cache[(chapter_text_cache)]
        AudioCache[(audio_cantillation_cache)]
        Reader[(reading_history / progress)]
    end
    Sefaria["Sefaria Open API"]
    PocketTorah["PocketTorah (audio source)"]

    U --> Home & Browse & Read
    Home -- "24h cache" --> Sefaria
    Browse -- "fallback: live fetch" --> DB
    Read -- "book TOC, always live" --> Sefaria
    Read -- "chapter text: cache-first, 7d SWR" --> Cache
    Read -. "cache miss" .-> Sefaria
    Read --> LinksAPI --> Sefaria
    Read --> AudioAPI -- "cache-first, 30d SWR" --> AudioCache
    AudioAPI -. "cache miss" .-> Sefaria
    Read -. "plays directly" .-> PocketTorah
    Read -- "non-blocking" --> ProgressAPI --> Reader
    Cron --> Sefaria
    Cron --> DB
```

`npm run sync:sefaria` runs the full catalog sync locally (~26 min, per-book verification) — too
long for a Vercel Function. The Cron job above does a fast metadata-only refresh instead. Full
details in [`docs/db-sync.md`](docs/db-sync.md).

## Project structure

```
src/
  app/
    page.tsx                  Home
    library/                  Category listing, server-rendered filter/sort/pagination
    search/                   Search
    book/[book]/              Book table of contents
    read/[book]/[chapter]/    Reader
    api/                      progress/sync, verse-links, audio-cantillation, cron/sync, health
  components/
    reader/                   ReaderView, CommentaryDrawer, AudioCantillationBar, ContinueReading
    home/                     GlobalReadingCalendar
    3d/                       Opt-in 3D Torah scroll
  lib/
    sefaria.ts                Sefaria API client — index/book/text, search, commentary, audio, calendar
    schema-resolver.ts        Resolves the three Sefaria address schemes
    library.ts / library-db.ts  Catalog helpers — live-fetch and Postgres-backed
    sync-catalog.ts           Shared sync logic: metadata-only vs. full verification
    site.ts                   Single source of truth for the site URL
  db/schema.ts                categories, books, sync_runs, reading_*, bookmarks, *_cache
scripts/                      Coverage audit, Sefaria sync CLI
tests/                        Vitest unit tests, Playwright E2E
docs/
  db-sync.md, a11y.md         Sync design, accessibility checklist
  adr/                        Architecture Decision Records
```

## Measured results

Real numbers from this project's 2026 remediation, re-verified live against production. Full
methodology and raw data live in the linked docs — this is the summary.

| Metric | Before | After |
| --- | --- | --- |
| Book readability (200-title sample) | 53.5% | 97.0% |
| Full catalog readability (6,602 books) | — | 98.45% |
| `/library/Halakhah` raw HTML (2,169 books) | 555.9 KB | 75.7 KB |
| Local TTFB, p50 | 640 ms | 4.9 ms |
| Lighthouse `/` (Perf/A11y/BP/SEO) | 77/98/100/100 | 77/99/100/100 |
| Lighthouse `/library` | 84/100/100/100 | 70/100/100/100 |
| Lighthouse `/read/Genesis/1` | 88/98/100/100 | 94/94/100/100 |

Two known regressions, not yet fixed: `/library`'s Lighthouse Performance score dropped to 70
(730ms Total Blocking Time — not yet root-caused), and `/read/Genesis/1`'s Accessibility dropped
to 94 (an `aria-hidden` focusable descendant and a heading-order issue). LCP lands in "Needs
Improvement" on every page measured, per [web.dev's thresholds](https://web.dev/articles/lcp) —
the top target for follow-up work. Full breakdown, per-route TTFB, and Core Web Vitals detail:
[`docs/coverage-report.md`](docs/coverage-report.md).

## Deployment

Hosted on [Vercel](https://vercel.com) with [Neon](https://neon.tech) Postgres. Pushes to
`master` deploy to production automatically.

## Attribution & license

Code is MIT-licensed (see [`LICENSE`](LICENSE)). Text content is not owned by this project:

- Hebrew source text is the Masoretic text, served via Sefaria (CC-BY-SA).
- English translations and metadata are served via the [Sefaria](https://www.sefaria.org) Open
  API under their respective per-work licenses.
- Cantillation audio is from the [PocketTorah](http://www.pockettorah.com) project
  (Ashkenazi trope, Avery-Binder style), CC-BY-SA, attributed inline in the player.

Sifria does not modify or reinterpret the underlying source text — see the `/about` page.
