# Sifria · Ánh Sáng Cổ Thư (סִפְרִיָּה)

Sifria is a Vietnamese-language reading site for classical and contemporary Israeli/Jewish texts
— Torah, Tanakh, Mishnah, Talmud, Kabbalah, Psalms, and more — presented with an Israeli-inspired,
animated 3D visual theme.

All book text (Hebrew + English) is fetched live from the open [Sefaria API](https://developers.sefaria.org).
Nothing is stored or fabricated locally — only UI copy and short category/book descriptions are
localized into Vietnamese.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL (currently used only for a health check)
- Content: [Sefaria](https://www.sefaria.org) Open API

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (used only by `/api/health` today)

### Setup

```bash
npm install
```

Create a `.env` file with:

```
DATABASE_URL=postgresql://user:password@localhost:5432/app_db
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | Description                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the local dev server     |
| `npm run build`     | Production build               |
| `npm run start`     | Run the production build       |
| `npm run lint`      | Lint with ESLint               |
| `npm run typecheck` | Type-check with `tsc --noEmit` |

There is no automated test suite yet.

## Project structure

```
src/
  app/            Next.js App Router routes (pages, layout, sitemap/robots/manifest, API routes)
  components/     Shared React components (header, footer, hero, marquee)
  lib/
    sefaria.ts    Sefaria API client (index/book/text fetching, HTML cleanup)
    vi.ts         Vietnamese display names/descriptions for categories & books
  db/             Drizzle/Postgres setup (schema is currently a placeholder)
```

## Deployment

Hosted on [Vercel](https://vercel.com) with [Neon](https://neon.tech) Postgres. Pushes to
`master` deploy to production automatically.

## Content attribution

Hebrew text is the Masoretic text (CC-BY-SA); English translations and book metadata are served
via the [Sefaria](https://www.sefaria.org) Open API under their respective licenses. Sifria does
not modify or reinterpret the underlying text — see the `/ve-chung-toi` page for more on the
project's approach.
