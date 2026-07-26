# ADR 0001: A schema resolver for Sefaria's three address schemes

## Status

Accepted, implemented in `src/lib/schema-resolver.ts`.

## Context

A random sample of 200 titles (seed-reproducible, `scripts/audit-coverage.ts`) showed only
53.5% of books were readable by walking the site's own primary path: `/sach/{book}` → click
"Đọc từ đầu" → `/doc/{book}/{first}`. `/doc/Berakhot/1` returned 200 with 0 verses; `/doc/Zohar/1`
didn't exist at all.

The root cause was `sach/[book]/page.tsx` assuming every Sefaria book is addressed by a flat
integer chapter array (`Array.from({ length: lengths[0] })`). Verified live against the Sefaria
API (not assumed from documentation), it actually has three distinct schemes:

- **Integer-like**: `schema.addressTypes[0]` is anything other than `"Talmud"`, with no
  `schema.nodes` — plain 1..N chapters. Note: for Tanakh books this is literally `"Perek"`, not
  `"Integer"` as might be assumed from the name of the category.
- **Talmud**: daf/amud paging starting at `2a` — there is no daf `1`.
- **Complex**: `schema.nodes` is a tree of named sections (e.g. Zohar, Guide for the Perplexed).
  Leaves use `titles: [{lang, text, primary}]` and `key`, not a `title` string, and have **no**
  per-node length in the raw index response — Sefaria auto-resolves a bare node ref (e.g.
  `"Zohar, Introduction"`) to its first section server-side.

A further wrinkle discovered during implementation: some structurally-valid first sections are
genuinely **empty** in Sefaria's data (sparse commentaries — e.g. `Ben Yehoyada on Shevuot 2a`
resolves and returns 200, but with zero verses; the real content starts several dapim later).
Sefaria exposes exactly where via the response's `next` field.

## Decision

Classify each book's address kind from its raw index response (`classifyAddressKind`), generate
the correct ref format per kind, and — critically — verify the *declared* first ref actually has
content before using it, following `next` past empty sections if it doesn't
(`findFirstReadableRef`). "Đọc từ đầu" always uses the verified ref, not just the structurally-first
one.

Also handled: Sefaria silently **clamps** an out-of-range integer ref to some other valid ref
instead of erroring (`/doc/Berakhot/999` → 200, identical content to `/doc/Berakhot/2a`, with its
own `sectionRef` claiming to be canonical). `isRefRefinement` (used in the routing fix, ADR-adjacent
but implemented alongside this resolver) compares what was requested against what Sefaria actually
resolved to, distinguishing a genuine clamp from a bare complex-node ref legitimately auto-resolving
deeper.

## Alternatives considered

- **Trust the plan's original pseudocode as-is.** Rejected: verified against the live API and found
  several assumptions wrong (`"Integer"` vs `"Perek"`; per-node `lengths` that don't exist for complex
  works; a `title` field that's actually `titles`+`key`). Blindly implementing the plan's version
  would have shipped a broken fix.
- **Enumerate every leaf's internal chapter count for complex books.** Rejected: the raw index
  response has no per-node length data for complex works; getting it would require a `getText` call
  per leaf per book. Since Sefaria already auto-resolves a bare node ref to its first section, this
  isn't needed for the primary "browse then read" path.
- **A combobox/search UI for large complex-node trees (>300 items).** Considered in the original
  plan for e.g. `Shulchan Arukh, Orach Chayim`'s 699 entries. Not implemented: it's a UX nicety, not
  required by the coverage gate, and the largest complex tree actually encountered (Zohar, 53 leaves)
  renders fine as a plain grid.

## Consequences

Coverage went from 53.5% to 98.5% (measured against the real click-through path, not book-count
alone). The residual 1.5% (3/200 in the sample) are dependent-commentary works with no own
`schema.lengths` — Sefaria expects their structure to be derived from `base_text_titles`, which is a
different, deeper mechanism not implemented here.
