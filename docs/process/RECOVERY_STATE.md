# Recovery State

## Repo summary
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 site ("Sifria") serving
Hebrew/English Torah/Tanakh/etc. text live from the Sefaria API, with a Vietnamese-language
UI. All 8 phases (A–H) of `CLAUDECODE_SIFRIA_end_to_end_fix_plan.md` are complete — see
`CHANGELOG_SIFRIA_FIXES.md` for full detail per phase.

## Files touched (final)
- `src/lib/site.ts` (new) — SITE_URL source of truth
- `src/lib/library.ts` (new) — shared flattenBooks/groupByCategory/sortCategories/searchBooks
- `src/lib/reader-storage.ts` (new) — localStorage reader prefs + history, `useSyncExternalStore`-based
- `src/app/layout.tsx`, `robots.ts`, `sitemap.ts` — SITE_URL-derived, sitemap now enumerates all real books/categories (6,615 URLs, was 24)
- `src/app/page.tsx`, `src/components/SiteFooter.tsx`, `src/app/manifest.ts` — copy truth fixes
- `src/app/search/page.tsx` (new), `src/components/SearchForm.tsx` (new) — real search
- `src/app/library/[category]/page.tsx` (new), `src/components/library/CategoryBrowser.tsx` (new) — full category listing
- `src/app/library/page.tsx` — uses shared lib, "…N more" links to category page
- `src/db/schema.ts` — real tables (was a placeholder); `scripts/sync-sefaria-index.ts` (new); `docs/db-sync.md` (new); `drizzle/0000_damp_the_anarchist.sql` (generated migration)
- `src/components/reader/ReaderView.tsx`, `ContinueReading.tsx` (new) — reader controls + history
- `src/app/read/[book]/[chapter]/page.tsx` — uses ReaderView
- `src/app/globals.css` — reduced-motion, skip-link, focus-visible
- `src/components/SiteHeader.tsx` — search box, skip-link target unaffected
- `next.config.ts` — security headers
- `src/lib/sefaria.ts` — `sefariaFetch` now throws on Sefaria's `{"error": "..."}` 200-status
  responses (found via manual 404 check: bogus book/chapter slugs were rendering thin fake
  pages at 200 instead of 404 — see CHANGELOG_SIFRIA_FIXES.md Phase H)
- `package.json` — next 16.2.6→16.2.11, postcss→8.5.22, sharp→0.35.3 (overrides), eslint-config-next→16.2.11, tsx added, `sync:sefaria`/`db:push` scripts
- `README.md` — rewritten to describe current architecture
- `.env` (gitignored, local only) — placeholder `DATABASE_URL` so `next build` doesn't crash on `/api/health`

## Unresolved issues / known limitations
- No real Neon/Postgres credentials in this environment — Phase D's schema/sync are
  typechecked and schema-verified (`drizzle-kit generate` produced a real migration) but
  never run against a live database. No page reads from these tables; the live UI still
  reads Sefaria directly.
- Reading history/progress is localStorage-only (anonymous, no login system exists) — not
  synced to the `reading_history`/`reading_progress` DB tables.
- CSP uses `'unsafe-inline'` for scripts/styles rather than a nonce-based policy (would
  require adding middleware — judged out of scope).
- 4 moderate `npm audit` findings remain, all the same esbuild-via-drizzle-kit dev-only
  chain; no non-breaking upstream fix exists (audit's own suggestion is a breaking
  drizzle-kit downgrade — not applied).

## Last validation command run
`npm run build` (pass) — final full pass after fixing the `sefariaFetch` 404 bug. Preceding
`npm run lint` and `npm run typecheck` also pass. Full manual route sweep against a rebuilt
`npm run start` production server: `/`, `/thu-vien`, `/thu-vien/Tanakh`, `/sach/Genesis`,
`/doc/Genesis/1`, `/tim-kiem?q=Genesis`, `/ve-chung-toi`, `/robots.txt`, `/sitemap.xml` all
200; `/sach/NotARealBook` and `/doc/NotARealBook/1` now correctly 404 (previously 200 before
the fix). Security headers verified present via `curl -I` in an earlier pass.

## Stop/resume point
All plan phases complete. Nothing was committed to git — no commit was requested by the
user. If resuming: review `CHANGELOG_SIFRIA_FIXES.md` "Known limitations" for what's
intentionally foundation-only, and `git status`/`git diff` for the full change set before
deciding whether to commit.
