# ADR 0002: Mirror the catalog into Postgres instead of fetching Sefaria live

## Status

Accepted, implemented in `src/lib/library-db.ts` + `src/lib/sync-catalog.ts`.

## Context

`/thu-vien`, `/thu-vien/[category]`, and `/tim-kiem` fetched Sefaria's `/index` tree live on every
request. That payload is measured at ~5.3MB — over Next.js's 2MB Data Cache per-entry limit (the
production build log literally prints `Failed to set Next.js data cache for
https://www.sefaria.org/api/index, items over 2MB can not be cached`), so a cold request never gets
cached: every visit re-downloads and re-parses the full tree.

A Postgres schema for mirroring this data already existed (`src/db/schema.ts` — `categories`,
`books`, `book_aliases`) from an earlier round of work, and had even been synced once, but no page
actually read from it.

## Decision

Read the catalog from Postgres for browsing/search, with a live-Sefaria fallback if the DB throws
or returns zero readable books (covers both real outages and "sync hasn't run yet").
`src/lib/library-db.ts` deliberately returns the *same* `FlatBook[]` shape the live-fetch path
already produced, so `/thu-vien`, `/thu-vien/[category]`, and `/tim-kiem` keep using the existing,
tested `library.ts` helpers (`groupByCategory`/`sortCategories`/`searchBooks`) completely unchanged
on top of it — only the data *source* changes.

`/sach/[book]` and `/doc/[book]/[chapter]` are **not** wired to Postgres — they read individual book
tables-of-contents and chapter text, which isn't mirrored, only catalog metadata (title, Hebrew
title, category, Vietnamese name, verified readability) is.

The sync itself splits into two modes (`src/lib/sync-catalog.ts`) after checking Vercel's actual
Function/Cron duration limits (300s Hobby; up to 800s, or 1800s with explicit extended-duration
config, on Pro/Enterprise — verified against Vercel's docs, not assumed): a full per-book
readability verification via the schema resolver (ADR 0001) makes 1-20+ live Sefaria calls per book
across 6,598 books — tens of minutes, measured at ~26 minutes in production — which cannot run
inside a Vercel Function on any tier. The weekly cron therefore runs a fast metadata-only refresh
(one `getIndex()` fetch, no per-book verification, finishes in seconds); the full verification stays
a manual CLI operation (`npm run sync:sefaria`).

## Alternatives considered

- **Implement search scoring/diacritic-folding in SQL** (e.g. `ILIKE` + Postgres `unaccent`).
  Rejected: Postgres `ILIKE` alone doesn't fold Vietnamese diacritics the way the existing
  `library.ts`'s `normalize()` (NFD decomposition + combining-mark strip) already does correctly,
  and reusing tested JS-side logic on top of a DB-sourced array was much lower-risk than adding a
  new Postgres extension and reimplementing scoring rules that already work.
- **Run the full readability verification on the weekly cron.** Rejected outright once the Vercel
  duration limits were checked — infeasible on any plan tier, not just a matter of preference.
- **Skip DB verification entirely and keep listing all 6,598 books regardless of readability**
  (matching the plan's originally-lower-priority framing, since ADR 0001 already fixes readability
  at *request* time). Considered, but the user explicitly chose the full scope including DB-level
  verification, mainly so the sitemap (a separate concern) can eventually filter to
  verified-readable books rather than the current popular-books-only `/doc` coverage.

## Consequences

`/thu-vien`/`/thu-vien/[category]`/`/tim-kiem` no longer depend on a 5.3MB live fetch for their
primary data; `/api/health` now reports `{ok, lastSync, booksCount, readableCount}` from the synced
data. The full sync (6,598 books) completed at 98.45% readable — closely matching the independent
sample-based coverage audit (98.5%) as a cross-check. The metadata-only cron mode intentionally never
touches the verification columns on conflict, so a routine weekly refresh can't silently wipe out
what the last full sync computed.
