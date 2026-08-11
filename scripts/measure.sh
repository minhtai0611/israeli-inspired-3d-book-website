#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-https://israeli-inspired-3d-book-website.vercel.app}"
OUT="docs/metrics-raw.txt"
: > "$OUT"

echo "=== Measured at $(date -Iseconds) - base=$BASE ===" | tee -a "$OUT"

echo "--- HTML size (compressed) ---" | tee -a "$OUT"
for u in / /library /library/Halakhah /library/Talmud /book/Genesis /read/Genesis/1; do
  s=$(curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w '%{size_download}' "$BASE$u")
  r=$(curl -s -o /dev/null -w '%{size_download}' "$BASE$u")
  printf "%-28s compressed=%-8s raw=%s\n" "$u" "$s" "$r" | tee -a "$OUT"
done

echo "--- Cache headers ---" | tee -a "$OUT"
for u in / /library /book/Genesis /read/Genesis/1 /read/Psalms/23; do
  h=$(curl -sI "$BASE$u" | grep -iE 'x-vercel-cache|x-nextjs-prerender' | tr -d '\r' | tr '\n' ' ')
  printf "%-28s %s\n" "$u" "$h" | tee -a "$OUT"
done

echo "--- TTFB (20 runs, /read/Genesis/1) ---" | tee -a "$OUT"
for i in $(seq 1 20); do
  curl -s -o /dev/null -w '%{time_total}\n' "$BASE/read/Genesis/1"
done | sort -n | awk '{a[NR]=$1} END {printf "p50=%.3fs p95=%.3fs\n", a[int(NR*0.5)], a[int(NR*0.95)]}' | tee -a "$OUT"

echo "--- Homepage JS bundle (compressed) ---" | tee -a "$OUT"
curl -s "$BASE/" -o /tmp/_home.html
tot=0; n=0
for j in $(grep -oE '/_next/static/[^"]+\.js' /tmp/_home.html | sort -u); do
  s=$(curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w '%{size_download}' "$BASE$j")
  tot=$((tot+s)); n=$((n+1))
done
echo "chunks=$n total_compressed=${tot}B" | tee -a "$OUT"

echo "--- Sitemap ---" | tee -a "$OUT"
sm=$(curl -s -o /tmp/_sm.xml -w '%{size_download} %{time_total}' "$BASE/sitemap.xml")
echo "size_time=$sm urls=$(grep -c '<loc>' /tmp/_sm.xml) read_urls=$(grep -c 'read/' /tmp/_sm.xml)" | tee -a "$OUT"

echo "--- Unbounded URL (crawler trap) ---" | tee -a "$OUT"
for c in 129 130 200 999 5000; do
  printf "  /read/Berakhot/%-6s " "$c"
  curl -s -o /tmp/_b.html -w '%{http_code} ' "$BASE/read/Berakhot/$c"
  echo "verses=$(grep -o 'class="verse ' /tmp/_b.html | wc -l)"
done | tee -a "$OUT"

echo "--- npm audit ---" | tee -a "$OUT"
npm audit --package-lock-only 2>&1 | tail -3 | tee -a "$OUT"
