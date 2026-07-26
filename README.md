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

- Browse the full Sefaria catalog by category at `/thu-vien` and `/thu-vien/[category]` (filter,
  sort A–Z, load-more — no 24-item dead end)
- Search books by English/Hebrew/Vietnamese name at `/tim-kiem`
- Reader controls at `/doc/[book]/[chapter]`: font size, line spacing, Hebrew/English/both
  toggle, per-verse copy-link (`#v12`-style deep links), all persisted per-browser
- "Continue reading" on the home page, from the same per-browser history
- Reduced-motion support, skip-to-content link, visible focus outlines
- Security headers (CSP, HSTS, X-Frame-Options, etc.) — see `next.config.ts`

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL — `/thu-vien`, `/thu-vien/[category]`, and
  `/tim-kiem` read the catalog from here (falling back to a live Sefaria fetch if the DB is
  unreachable); see `docs/db-sync.md`. `/sach` and `/doc` still read Sefaria directly per request.
- Content: [Sefaria](https://www.sefaria.org) Open API

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
| `npm run audit:coverage` | Sample the catalog and measure real book readability (see `scripts/audit-coverage.ts`) |
| `npm run db:push`     | Push `src/db/schema.ts` to `DATABASE_URL`             |
| `npm run sync:sefaria`| Full catalog sync + per-book readability verification — see `docs/db-sync.md` |

CI runs lint, typecheck, the unit suite, a production-dependency security audit, and a build on
every push/PR — see `.github/workflows/ci.yml`. A weekly Vercel Cron (`vercel.json`) hits
`/api/cron/sync` for a fast metadata-only refresh between full syncs.

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
docs/
  db-sync.md                    How the two sync modes work, what's DB-backed vs. still live
  a11y.md                       Accessibility checklist — what was checked and how
```

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
