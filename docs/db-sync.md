# Sefaria index → Postgres sync

## Status today

`/thu-vien`, `/thu-vien/[category]`, `/sach/[book]`, `/doc/[book]/[chapter]`, and `/tim-kiem`
all read the Sefaria index/text APIs directly at request time (cached via Next's `fetch`
revalidation). This works but the `/index` payload is ~5.3MB, which is over Next's 2MB data-cache
limit — every cold request re-fetches the full tree from Sefaria instead of hitting a cache.

The schema in `src/db/schema.ts` and the sync script below mirror the index into Postgres so the
library/search pages can eventually query the local table instead of Sefaria on every request.

**The production Neon database has been synced once** (2026-07-23): 14 categories, 6,598 books,
18 aliases (one per book with a Vietnamese label in `src/lib/vi.ts` today — most books don't have
one yet, hence the low alias count relative to book count). Check `sync_runs` for the audit trail.
**No page reads from these tables yet** — `/thu-vien` etc. still read Sefaria live at request
time. Wiring them over to Postgres, and re-running the sync on a schedule, are still follow-ups.

## Tables

- `categories` — one row per top-level Sefaria category (`key`, English/Vietnamese names, icon)
- `books` — one row per book (`title` is the Sefaria canonical title, unique), FK to `categories.key`
- `book_aliases` — alternate search terms per book (currently just the Vietnamese display name)
- `sync_runs` — audit log of each sync attempt (status, book count, error message)
- `reading_history` / `reading_progress` / `bookmarks` — anonymous (no login), keyed by a
  client-generated id — foundation for the reader retention features in `docs`/Phase E; the
  shipped reader controls currently use `localStorage` directly and do not write to these tables.

## Running it

Requires a real, reachable `DATABASE_URL` (Neon or any Postgres 14+):

```bash
# 1. Create the tables (drizzle.config.ts reads DATABASE_URL from the environment/.env)
npm run db:push
# — or, to review the SQL first: npx drizzle-kit generate, then apply drizzle/*.sql yourself

# 2. Populate them from the live Sefaria index
npm run sync:sefaria
```

`scripts/sync-sefaria-index.ts` fetches `getIndex()`, flattens it with the same
`src/lib/library.ts` helpers the UI uses, upserts categories/books/aliases (by unique
key/title, so re-running is safe), and records one `sync_runs` row per attempt.

## Not done here

- No cron/webhook triggers this automatically — it's a manual `npm run sync:sefaria` today.
  The index changes rarely, but the sync should be re-run periodically to stay current.
- No page has been switched over to read from Postgres instead of the live Sefaria fetch —
  the tables are populated but not yet consumed by any route.
- Only 18 of 6,598 books have a `book_aliases` row today, because only that many have a
  Vietnamese label in `src/lib/vi.ts` — expanding `BOOK_VI` and re-running the sync would
  grow that coverage.
