# Sefaria index → Postgres sync

## Status today

`/thu-vien`, `/thu-vien/[category]`, and `/tim-kiem` read the catalog (title, Hebrew title,
category, Vietnamese name, and verified readability) from Postgres via `src/lib/library-db.ts`,
falling back to a live Sefaria `/index` fetch if the DB is unreachable or returns no readable
books (e.g. before the first sync has run). `/doc/[book]/[chapter]` reads chapter text through
`getText()` in `src/lib/sefaria.ts`, which mirrors each ref into `chapter_text_cache`
(stale-while-revalidate, 7-day window) — a repeat read of the same chapter within that window
skips the Sefaria round-trip entirely. `/sach/[book]`'s book table-of-contents is still not
mirrored.

The `/index` payload is ~5.3MB, over Next's 2MB data-cache limit, so a live-fetch cold request
never gets cached — this is the actual problem the DB read path solves for the browsing/search
pages.

## Tables

- `categories` — one row per top-level Sefaria category (`key`, English/Vietnamese names, icon)
- `books` — one row per book (`title` is the Sefaria canonical title, unique), FK to
  `categories.key`, plus readability-verification columns computed by
  `src/lib/schema-resolver.ts`'s address-scheme classifier: `address_type`
  (integer/talmud/complex/unknown), `first_valid_ref` (what "Đọc từ đầu" should link to —
  content-verified via `findFirstReadableRef`, not just the structurally-first section),
  `is_readable`, `section_count`, `verified_at`
- `book_aliases` — alternate search terms per book (currently just the Vietnamese display name)
- `sync_runs` — audit log of each sync attempt (status, book count, error message)
- `reading_history` / `reading_progress` — anonymous (no login), keyed by a client-generated UUID
  (`src/lib/client-id.ts`); `ReaderView` mirrors localStorage reader state into these via
  `POST /api/progress/sync` on every chapter view (non-blocking, best-effort). `bookmarks` has no
  writer yet — no bookmarking UI exists in the reader.
- `chapter_text_cache` — SWR mirror of `getText()` responses (`src/lib/sefaria.ts`), keyed by ref,
  7-day staleness window. `npm run sync:sefaria`'s readability verification (`verifyReadability` in
  `src/lib/sync-catalog.ts`) also calls `getText()`, so a full catalog sync incidentally pre-warms
  this cache for every book's opening section — a side benefit, not something it was built for.

## Two sync modes — and why there are two

`src/lib/sync-catalog.ts` has both, sharing the same upsert/error-handling scaffolding:

- **`runMetadataOnlySync`** — title/category/Vietnamese-name fields only, one `getIndex()` fetch,
  no per-book Sefaria calls. Finishes in seconds regardless of catalog size. This is what
  `/api/cron/sync` runs weekly (see `vercel.json`) — it deliberately does **not** touch
  `address_type`/`first_valid_ref`/`is_readable`/`section_count`/`verified_at` on conflict, so a
  routine metadata refresh never wipes out the more expensive verification data.
- **`runFullCatalogSync`** — everything above, plus a live readability check per book via
  `resolveStructure`/`findFirstReadableRef` (the same logic `BookPage` uses for "Đọc từ đầu").
  This is 1-20+ Sefaria API calls per book across 6,598 books — tens of minutes — which does not
  fit in a Vercel Function's execution window (300s on Hobby; up to 800s, or 1800s with explicit
  extended-duration config, on Pro/Enterprise — verified against Vercel's docs 2026-07-26). CLI
  only: `npm run sync:sefaria` (`scripts/sync-sefaria-index.ts`).

## Running the full sync

Requires a real, reachable `DATABASE_URL` (Neon or any Postgres 14+):

```bash
# 1. Push schema changes (drizzle.config.ts reads DATABASE_URL from the environment/.env)
npm run db:push

# 2. Populate + verify from the live Sefaria index (slow — see above)
npm run sync:sefaria
```

## Weekly cron re-sync

`vercel.json` schedules `GET /api/cron/sync` for Monday 03:00 UTC. Requires a `CRON_SECRET`
environment variable set in the Vercel project — Vercel automatically sends it as
`Authorization: Bearer <CRON_SECRET>` on every invocation; the route rejects any request without
a matching header. Cron delivery is best-effort (Vercel does not retry failures, and can
occasionally invoke more than once) — the upserts here are idempotent, so a duplicate or missed
weekly run is safe either way.

## `/api/health`

Reports `{ ok, lastSync, booksCount, readableCount }` — `lastSync`/`booksCount` come from the most
recent successful `sync_runs` row, `readableCount` from a live `COUNT(*) FILTER (WHERE is_readable)`
over `books`.

## Not done here

- Only 18 of 6,598 books have a `book_aliases` row today, because only that many have a
  Vietnamese label in `src/lib/vi.ts` — expanding `BOOK_VI` and re-running the full sync would
  grow that coverage.
- `/sach`'s book table-of-contents is not DB-backed — it still reads Sefaria live per request
  (already cached via `generateStaticParams` for the popular-books set).
