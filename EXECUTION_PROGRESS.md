# Execution Progress — Sifria Production Hardening

Plan source: `CLAUDECODE_SIFRIA_end_to_end_fix_plan.md`

## Current phase
Done — all phases (A–H) complete.

## Tasks

- [x] A. Site URL source of truth + SEO/robots/sitemap/JSON-LD domain fix + copy truth
      + bonus: patched next 16.2.6→16.2.11 (fixes 2 HIGH advisories: SSRF/DoS/cache-confusion),
      forced postcss→8.5.22 and sharp→0.35.3 via npm overrides (fixes 1 HIGH + 1 MODERATE
      nested inside next's own bundled deps). Remaining 4 moderate advisories are all the
      same esbuild-via-drizzle-kit dev-only chain; no non-breaking fix exists upstream
      (audit's own suggested fix is a drizzle-kit downgrade to 0.18.1 — a regression, not
      applied). Verified via `npm run build` + `npm start` smoke test: canonical/robots/
      sitemap/JSON-LD all consistently derive from SITE_URL, fake SearchAction removed.
- [x] B. Real search route `/tim-kiem` (metadata search over Sefaria index, EN/HE/VI names),
      `SearchForm` in header + mobile nav, SearchAction JSON-LD restored pointing at the real
      route. Verified: `?q=Genesis` and `?q=Thi%20Thi%C3%AAn` (Vietnamese label) both return
      results; `SearchAction.target` in homepage JSON-LD resolves correctly.
- [x] C. Library discoverability — extracted shared `src/lib/library.ts`
      (flattenBooks/groupByCategory/sortCategories/searchBooks), added
      `/thu-vien/[category]` full listing with client-side filter+sort+load-more
      (`CategoryBrowser`), "…N more" now links there instead of dead-ending. Sitemap
      rewritten to enumerate all real categories+books from the Sefaria index instead of
      24 hardcoded titles — verified 6,615 URLs in `/sitemap.xml` (was 24).
- [x] D. Real Drizzle schema (`categories`, `books`, `book_aliases`, `sync_runs`,
      `reading_history`, `reading_progress`, `bookmarks`) + `scripts/sync-sefaria-index.ts`
      (upserts from the live Sefaria index) + `docs/db-sync.md`. Verified via
      `npx drizzle-kit generate` — produced a real migration
      (`drizzle/0000_damp_the_anarchist.sql`, 7 tables, FKs correct) without needing a live
      DB. Not run end-to-end against Postgres (no credentials available locally) and no page
      reads from these tables yet — documented as a foundation, not a cutover.
- [x] E. `ReaderView` client component: font-size (A−/A+), line-spacing cycle, HE/EN/both
      toggle, per-verse copy-link button (verse anchors `#v{n}` already existed) — prefs
      persisted to localStorage via `useSyncExternalStore` (not effect+setState, which
      `eslint-config-next`'s `react-hooks/set-state-in-effect` rule correctly rejected on
      first pass — fixed properly, not suppressed). `ContinueReading` widget on the home
      page reads a localStorage-backed recently-read list, same external-store pattern.
      No DB write — this is the client-side "retention foundation" the plan allows as an
      MVP; `reading_history`/`reading_progress` DB tables exist in schema for a future sync.
- [x] F. `@media (prefers-reduced-motion: reduce)` override in globals.css (kills all
      keyframe animations + smooth scroll), skip-to-content link + `#main-content` on
      `<main>`, global `:focus-visible` outline, removed two `outline-none` instances that
      would have defeated it. Verified shipped CSS contains both the media query and
      `.skip-link` rule.
- [x] G. Security headers in `next.config.ts` (CSP, X-Content-Type-Options, X-Frame-Options,
      Referrer-Policy, Permissions-Policy, HSTS w/o preload). Verified via `curl -I` that all
      six headers are served and pages still render 200. CSP reviewed against the actual
      external-URL surface (all server-side API fetches or plain `<a href>` links — nothing
      the CSP would block). Dependency audit already done in Phase A (next 16.2.11, postcss
      8.5.22, sharp 0.35.3 — 2 HIGH + 1 MODERATE fixed; 4 MODERATE esbuild-via-drizzle-kit
      dev-only findings remain, accepted, no non-breaking fix upstream).
- [x] H. Final `npm install`/`lint`/`typecheck`/`build` all green. `README.md` rewritten to
      describe new routes/scripts/structure honestly. `CHANGELOG_SIFRIA_FIXES.md` written
      with per-phase what/why/routes/verification. This file and `RECOVERY_STATE.md` kept
      current throughout. Manual route check surfaced a real bug: `/sach/NotARealBook`
      returned 200 instead of 404 — Sefaria's API returns HTTP 200 with `{"error": "..."}`
      for unknown titles/refs, and `sefariaFetch` only checked `res.ok`. Fixed at the choke
      point (`src/lib/sefaria.ts`), re-validated full build + all routes including the fix.

## Latest validation status
`npm run lint` ✓ · `npm run typecheck` ✓ · `npm run build` ✓ (all 9 routes compile) ·
`npm audit`: 0 HIGH, 4 MODERATE (accepted, dev-only, see CHANGELOG). All mandated manual
routes returned 200 with correct content against a rebuilt local production server, and
`/sach/NotARealBook` + `/doc/NotARealBook/1` now correctly return 404 (see
CHANGELOG_SIFRIA_FIXES.md Phase H table/bugfix note).

## Next immediate action
None outstanding from the plan. See CHANGELOG_SIFRIA_FIXES.md "Known limitations" for what's
intentionally left as foundation-only (DB sync not run live, localStorage-only retention,
non-nonce CSP).

## Known constraint
No `DATABASE_URL` pointing at a real, reachable Postgres instance in this environment — a
placeholder `.env` (gitignored) was created so `next build`'s page-data collection for
`/api/health` doesn't crash; Phase D's schema/sync script are typechecked and schema-verified
(`drizzle-kit generate`) but never run against a live database.
