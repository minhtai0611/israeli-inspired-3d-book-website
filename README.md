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

- Browse the full Sefaria catalog by category at `/thu-vien` and `/thu-vien/[category]`
  (server-side filter/sort/pagination via URL params — works with JavaScript disabled)
- Search books by English/Hebrew/Vietnamese name at `/tim-kiem`, with diacritic-insensitive
  Vietnamese matching ("thi thien" finds "Thi Thiên")
- Reader controls at `/doc/[book]/[chapter]`: font size, line spacing, Hebrew/English/both
  toggle, per-verse copy-link (`#v12`-style deep links), all persisted per-browser
- Correctly handles Sefaria's three chapter-addressing schemes (plain integer, Talmud daf, and
  named complex sections like Zohar) — see `docs/adr/0001-schema-resolver.md`
- "Continue reading" on the home page, from the same per-browser history
- Dynamic OG images, sitemap, BreadcrumbList JSON-LD for social sharing/SEO
- `lang="he"`/`lang="en"` on all bilingual text, WCAG AA contrast, reduced-motion and
  high-contrast media query support, skip-to-content link, visible focus outlines — see
  `docs/a11y.md`
- Security headers (CSP, HSTS, X-Frame-Options, etc.) — see `next.config.ts`

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL — `/thu-vien`, `/thu-vien/[category]`, and
  `/tim-kiem` read the catalog from here (falling back to a live Sefaria fetch if the DB is
  unreachable); see `docs/db-sync.md`. `/sach` and `/doc` still read Sefaria directly per request.
- Content: [Sefaria](https://www.sefaria.org) Open API

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        U[User]
    end
    subgraph Vercel["Vercel (Next.js 16 App Router)"]
        Browse["/thu-vien, /thu-vien/[category], /tim-kiem"]
        Read["/sach/[book], /doc/[book]/[chapter]"]
        Cron["/api/cron/sync (weekly, CRON_SECRET)"]
        Health["/api/health"]
    end
    subgraph Neon["Neon Postgres"]
        DB[(categories / books / book_aliases)]
    end
    Sefaria["Sefaria Open API"]

    U --> Browse
    U --> Read
    Browse -- "catalog read (fallback: live fetch)" --> DB
    Read -- "book TOC + chapter text, always live" --> Sefaria
    Cron -- "fast metadata-only refresh" --> Sefaria
    Cron -- "upsert" --> DB
    Health -- "lastSync, readableCount" --> DB
```

`npm run sync:sefaria` (manual CLI, not on Vercel — see `docs/db-sync.md`) runs the slow full
catalog sync with per-book readability verification (~26 min for 6,598 books); the Vercel Cron
above only does the fast metadata-only refresh, since Vercel Functions can't run that long.

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (required to boot at all — see `src/db/index.ts`; browsing/search read
  from it with a live-Sefaria fallback, see `docs/db-sync.md`)

### Setup

```bash
npm install
```

Create a `.env` file with:

```
DATABASE_URL=postgresql://user:password@localhost:5432/app_db

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
    thu-vien/                   Library: category listing (page.tsx, [category]/ — server-side
                                 filter/sort/pagination via searchParams)
    tim-kiem/                   Search
    sach/[book]/                Book table of contents (+ generateStaticParams for popular books)
    doc/[book]/[chapter]/       Reader (+ generateStaticParams for popular chapters, opengraph-image.tsx)
    api/health/, api/cron/sync/ DB health check; weekly catalog metadata refresh
    robots.ts, sitemap.ts, opengraph-image.tsx, manifest.ts, layout.tsx
                                 All derive their URL from lib/site.ts
  components/
    reader/                     ReaderView (controls, verse copy-link), ContinueReading
    SearchForm.tsx, SiteHeader.tsx, SiteFooter.tsx, HeroOrbit.tsx, HebrewMarquee.tsx
  lib/
    sefaria.ts                  Sefaria API client (index/book/text fetching, HTML cleanup)
    schema-resolver.ts          Resolves Sefaria's 3 address schemes (integer/Talmud daf/complex)
    library.ts                  Shared index-flattening/grouping/search helpers (live-fetch source)
    library-db.ts               Same FlatBook[] shape, sourced from Postgres (browsing/search)
    sync-catalog.ts             Shared sync logic: fast metadata-only vs. slow full-verification
    hebrew-numeral.ts           Hebrew numeral formatting (chapter/daf labels)
    popular-books.ts            Torah + Psalms + 5 Megillot + Pirkei Avot — the prerendered set
    reader-storage.ts           localStorage-backed reader prefs + history (useSyncExternalStore)
    site.ts                     SITE_URL — single source of truth for every canonical/robots/
                                 sitemap/JSON-LD URL
    vi.ts                       Vietnamese display names/descriptions for categories & books
  db/
    schema.ts                   categories/books/book_aliases/sync_runs/reading_*/bookmarks
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
context for each row is in the linked ADR/doc.

| Metric | Before | After | Source |
| --- | --- | --- | --- |
| Book readability (200-title sample, real click-through) | 53.5% | 98.5% | `docs/adr/0001-schema-resolver.md` |
| Production catalog sync (6,598 books, live) | — | 98.45% verified readable | `docs/db-sync.md` |
| `/thu-vien/Halakhah` raw HTML (2,169-book category) | 555.9 KB | 72.4 KB | `docs/adr/0003-server-side-pagination.md` |
| Local TTFB, p50 | 640 ms | 4.9 ms | `scripts/measure.sh` baseline vs. after Phase 4 caching |
| Lighthouse — `/` (Performance / A11y / Best Practices / SEO) | — | 77 / 98 / 100 / 100 | `.lighthouserc.json` |
| Lighthouse — `/thu-vien` | — | 84 / 100 / 100 / 100 | `.lighthouserc.json` |
| Lighthouse — `/doc/Genesis/1` | — | 88 / 98 / 100 / 100 | `.lighthouserc.json` |

The Performance scores (77–88) are the main known gap — not addressed by this remediation, which
focused on correctness (readability, 404 semantics), data volume, and SEO/a11y. Likely next targets
are Sefaria fetch latency on cache-miss and unoptimized image/font loading, but that wasn't profiled
here.

## Deployment

Hosted on [Vercel](https://vercel.com) with [Neon](https://neon.tech) Postgres. Pushes to
`master` deploy to production automatically. Set `NEXT_PUBLIC_SITE_URL` in the Vercel project's
environment variables if serving from a custom domain — otherwise the site correctly falls back
to the assigned `*.vercel.app` URL (see `src/lib/site.ts`).

## Content attribution

Hebrew text is the Masoretic text (CC-BY-SA); English translations and book metadata are served
via the [Sefaria](https://www.sefaria.org) Open API under their respective licenses. Sifria does
not modify or reinterpret the underlying text — see the `/ve-chung-toi` page for more on the
project's approach.

## License

Code: MIT (see `LICENSE`).

The text content served by this site is **not** owned by this project:
- Hebrew source text is served via Sefaria under its own licensing (typically CC-BY-SA).
- English translations and metadata are served via the [Sefaria](https://www.sefaria.org) Open
  API under their respective per-work licenses.

Sifria does not modify or reinterpret the underlying source text.
