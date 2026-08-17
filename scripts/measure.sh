#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-https://israeli-inspired-3d-book-website.vercel.app}"
OUT="docs/metrics-raw.txt"
: > "$OUT"

echo "=== Measured at $(date -Iseconds) - base=$BASE ===" | tee -a "$OUT"

cat <<'EOM' | tee -a "$OUT"
--- Methodology ---
TTFB graded per web.dev/articles/ttfb: Good <=800ms, Needs Improvement <=1800ms,
Poor >1800ms. p75 is reported (alongside p50/p95) because that's the percentile
Core Web Vitals field assessment actually uses (web.dev/defining-core-web-vitals-thresholds),
from n=20 sequential requests per route (a RUM-style minimum for a stable tail
percentile). Real-browser metrics (LCP, CLS, INP) require rendering a page in
an actual browser (Lighthouse/CrUX) and are intentionally out of scope for this
curl-based pass — see .lighthouserc.json (run via `npx lhci autorun` against a
local production build) for those.
One route per address-kind is covered (see docs/adr/0001-schema-resolver.md):
integer chapters (Genesis), Talmud daf (Berakhot), and complex-schema sections
(Zohar) — plus one large (2,169-book Halakhah) and one minimal (1-book Musar)
category, since page cost scales with catalog data volume, not just route type.
EOM

grade_ttfb() {
  awk -v t="$1" 'BEGIN { ms = t * 1000; if (ms <= 800) print "Good"; else if (ms <= 1800) print "Needs Improvement"; else print "Poor" }'
}

measure_ttfb() {
  local url="$1" label="$2" n="${3:-20}"
  local times p50 p75 p95
  times=$(for i in $(seq 1 "$n"); do curl -s -o /dev/null -w '%{time_total}\n' "$url"; done | sort -n)
  p50=$(echo "$times" | awk -v n="$n" 'NR==int(n*0.50)+1{print; exit}')
  p75=$(echo "$times" | awk -v n="$n" 'NR==int(n*0.75)+1{print; exit}')
  p95=$(echo "$times" | awk -v n="$n" 'NR==int(n*0.95)+1{print; exit}')
  printf "%-38s p50=%-7s p75=%-7s (%-17s) p95=%s\n" "$label" "${p50}s" "${p75}s" "$(grade_ttfb "$p75")" "${p95}s" | tee -a "$OUT"
}

echo "--- TTFB by route/page type (n=20 each, graded on p75 per web.dev) ---" | tee -a "$OUT"
measure_ttfb "$BASE/" "/ (home)"
measure_ttfb "$BASE/library" "/library (catalog index)"
measure_ttfb "$BASE/library/Halakhah" "/library/Halakhah (2,169-book category)"
measure_ttfb "$BASE/library/Musar" "/library/Musar (1-book category)"
measure_ttfb "$BASE/search?q=genesis" "/search?q=... (query)"
measure_ttfb "$BASE/book/Genesis" "/book/Genesis (integer-address book)"
measure_ttfb "$BASE/book/Berakhot" "/book/Berakhot (Talmud daf book)"
measure_ttfb "$BASE/book/Zohar" "/book/Zohar (complex-schema book)"
measure_ttfb "$BASE/read/Genesis/1" "/read/Genesis/1 (integer chapter)"
measure_ttfb "$BASE/read/Berakhot/2a" "/read/Berakhot/2a (Talmud daf)"
measure_ttfb "$BASE/read/Zohar/Introduction%201" "/read/Zohar/... (complex section)"
measure_ttfb "$BASE/api/health" "/api/health (API route)"

echo "--- HTML payload size by route/page type (compressed vs raw) ---" | tee -a "$OUT"
for u in / /library /library/Halakhah /library/Musar "/search?q=genesis" /about \
  /book/Genesis /book/Berakhot /book/Zohar \
  /read/Genesis/1 /read/Berakhot/2a "/read/Zohar/Introduction%201"; do
  s=$(curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w '%{size_download}' "$BASE$u")
  r=$(curl -s -o /dev/null -w '%{size_download}' "$BASE$u")
  printf "%-34s compressed=%-8s raw=%s\n" "$u" "$s" "$r" | tee -a "$OUT"
done

echo "--- Cache headers by route/page type ---" | tee -a "$OUT"
for u in / /library /library/Halakhah /search /book/Genesis /book/Berakhot /book/Zohar \
  /read/Genesis/1 /read/Berakhot/2a /read/Psalms/23 /api/health; do
  h=$(curl -sI "$BASE$u" | grep -iE 'x-vercel-cache|x-nextjs-prerender' | tr -d '\r' | tr '\n' ' ')
  printf "%-28s %s\n" "$u" "$h" | tee -a "$OUT"
done

echo "--- Homepage JS bundle (compressed) ---" | tee -a "$OUT"
curl -s "$BASE/" -o /tmp/_home.html
tot=0; n=0
for j in $(grep -oE '/_next/static/[^"]+\.js' /tmp/_home.html | sort -u); do
  s=$(curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w '%{size_download}' "$BASE$j")
  tot=$((tot+s)); n=$((n+1))
done
echo "chunks=$n total_compressed=${tot}B" | tee -a "$OUT"

echo "--- Sitemap ---" | tee -a "$OUT"
# generateSitemaps() splits the catalog across /sitemap/[id].xml chunks (see
# src/app/robots.ts) — there is no single /sitemap.xml once split, so read the
# chunk list from robots.txt instead of assuming a fixed URL/count.
: > /tmp/_sm.xml
for sm_url in $(curl -s "$BASE/robots.txt" | grep -oE 'https?://[^ ]+/sitemap/[^ ]+\.xml'); do
  curl -s "$sm_url" >> /tmp/_sm.xml
done
echo "chunks=$(curl -s "$BASE/robots.txt" | grep -c '^Sitemap:') urls=$(grep -c '<loc>' /tmp/_sm.xml) read_urls=$(grep -c 'read/' /tmp/_sm.xml)" | tee -a "$OUT"

echo "--- API/meta endpoints (status only) ---" | tee -a "$OUT"
for u in /robots.txt /manifest.webmanifest /read/Genesis/1/opengraph-image /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$u")
  printf "%-32s %s\n" "$u" "$code" | tee -a "$OUT"
done

echo "--- Unbounded URL (crawler trap) ---" | tee -a "$OUT"
for c in 129 130 200 999 5000; do
  printf "  /read/Berakhot/%-6s " "$c"
  curl -s -o /tmp/_b.html -w '%{http_code} ' "$BASE/read/Berakhot/$c"
  echo "verses=$(grep -o 'class="verse ' /tmp/_b.html | wc -l)"
done | tee -a "$OUT"

echo "--- npm audit ---" | tee -a "$OUT"
npm audit --package-lock-only 2>&1 | tail -3 | tee -a "$OUT"
