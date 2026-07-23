# Sifria · Ánh Sáng Cổ Thư (סִפְרִיָּה)

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
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL — used by `/api/health`, and as a metadata/
  search foundation (see `docs/db-sync.md`); the live UI still reads Sefaria directly today
- Content: [Sefaria](https://www.sefaria.org) Open API

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (used by `/api/health`; also needed if you run the sync script in
  `docs/db-sync.md`)

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
| `npm run db:push`     | Push `src/db/schema.ts` to `DATABASE_URL`             |
| `npm run sync:sefaria`| Mirror the Sefaria index into Postgres — see `docs/db-sync.md` |

There is no automated test suite yet.

## Project structure

```
src/
  app/
    page.tsx                    Home
    thu-vien/                   Library: full category listing (page.tsx, [category]/)
    tim-kiem/                   Search
    sach/[book]/                Book table of contents
    doc/[book]/[chapter]/       Reader
    robots.ts, sitemap.ts, manifest.ts, layout.tsx   All derive their URL from lib/site.ts
  components/
    reader/                     ReaderView (controls, verse copy-link), ContinueReading
    library/                    CategoryBrowser (client-side filter/sort/load-more)
    SearchForm.tsx, SiteHeader.tsx, SiteFooter.tsx, HeroOrbit.tsx, HebrewMarquee.tsx
  lib/
    sefaria.ts                  Sefaria API client (index/book/text fetching, HTML cleanup)
    library.ts                  Shared index-flattening/grouping/search helpers
    reader-storage.ts           localStorage-backed reader prefs + history (useSyncExternalStore)
    site.ts                     SITE_URL — single source of truth for every canonical/robots/
                                 sitemap/JSON-LD URL
    vi.ts                       Vietnamese display names/descriptions for categories & books
  db/
    schema.ts                   categories/books/book_aliases/sync_runs/reading_*/bookmarks
scripts/
  sync-sefaria-index.ts         Mirrors the Sefaria index into the tables above
docs/
  db-sync.md                    How the sync script works, what's wired up vs. foundation-only
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
