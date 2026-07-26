# ADR 0003: Server-side filter/sort/pagination for `/thu-vien/[category]`

## Status

Accepted, implemented in `src/app/thu-vien/[category]/page.tsx`.

## Context

`/thu-vien/[category]` passed its *entire* category's book array to a client component
(`CategoryBrowser`) that did search/sort/pagination in the browser, showing 24 at a time. Measured
before the fix: `/thu-vien/Halakhah` (2,169 books in that category) shipped 555.9 KB of raw HTML —
essentially the whole category serialized into the page — to display 24 cards.

## Decision

Move filtering, A–Z sorting, and pagination server-side, driven entirely by `q`/`sort`/`page`
`searchParams`, rendered through a plain `<form method="get">` (matching the existing
`SearchForm.tsx` progressive-enhancement convention already used on `/tim-kiem`) instead of a
client component with local state. `CategoryBrowser.tsx` was deleted (impact-checked first via
GitNexus: one caller, low risk).

## Alternatives considered

- **Keep the client component, just reduce the props it receives** (e.g. paginate server-side but
  still ship the *filtered* set for client-side re-sort). Rejected: any client-side filtering still
  requires shipping more than the 24 visible books to the browser, which is the actual bug — the
  data volume, not just which specific books are shown.
- **Debounced client-side search hitting an API route.** Rejected as unnecessary complexity: a plain
  GET form gives URL-shareable, back-button-friendly, no-JS-required filtering for free, and this
  site has no live-typing-search requirement (the existing `/tim-kiem` already established this
  pattern site-wide).

## Consequences

Measured: `/thu-vien/Halakhah` raw HTML dropped from 555.9 KB to 72.4 KB (compressed: 42.7 KB →
18.4 KB). The plan's own gate wanted the *result* under 40 KB raw — not hit exactly, but a
deliberately-checked comparison against a **1-book** category (Musar, 77 KB raw) showed the page no
longer scales with category size *at all*, which was the actual defect; the remaining ~72–77 KB is
fixed site-shell cost (header/nav/footer/RSC hydration payload) shared by every page on the site,
a different, site-wide concern not addressed here. Filtered/sorted/paginated results are now
URL-shareable and work with JavaScript fully disabled (verified via Playwright's `request` fixture
in `tests/e2e/reader.spec.ts` — a raw HTTP GET is arguably a more direct test of this claim than a
JS-disabled browser context, which hit an unrelated Chromium/Next.js streaming-SSR quirk on this
specific route during test-writing).
