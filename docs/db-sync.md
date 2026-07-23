# Sefaria index → Postgres sync (foundation)

## Status today

`/thu-vien`, `/thu-vien/[category]`, `/sach/[book]`, `/doc/[book]/[chapter]`, and `/tim-kiem`
all read the Sefaria index/text APIs directly at request time (cached via Next's `fetch`
revalidation). This works but the `/index` payload is ~5.3MB, which is over Next's 2MB data-cache
limit — every cold request re-fetches the full tree from Sefaria instead of hitting a cache.

The schema in `src/db/schema.ts` and the sync script below are a foundation for fixing that: mirror
the index into Postgres once, then have the library/search pages query the local table instead of
Sefaria on every request. **Nothing currently reads from these tables** — wiring `/thu-vien` etc.
over to Postgres is a follow-up once a real database is synced and validated in production.

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
# 1. Create the tables (uses drizzle.config.json)
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
- No page has been switched over to read from Postgres instead of the live Sefaria fetch.
- No local Postgres was available in the environment this was built in, so the script above is
  typechecked and its schema is verified via `drizzle-kit generate` (produces a real migration,
  `drizzle/0000_damp_the_anarchist.sql`), but it has not been run end-to-end against a live
  database.
