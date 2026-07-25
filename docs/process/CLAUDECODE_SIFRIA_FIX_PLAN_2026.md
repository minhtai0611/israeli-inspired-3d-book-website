# CLAUDE CODE — KẾ HOẠCH SỬA LỖI END-TO-END: DỰ ÁN **SIFRIA**
## Thực thi với GitNexus MCP + Serena MCP · Bản đầy đủ, có cổng nghiệm thu từng pha

> **Repo**: `minhtai0611/israeli-inspired-3d-book-website`
> **Live**: `https://israeli-inspired-3d-book-website.vercel.app`
> **Base commit**: `392fd57` (23/07/2026)
> **Nguồn phát hiện**: `SIFRIA_THAM_DINH_DU_AN_2026.md` (biên bản thẩm định hội đồng)
> **Ngày lập plan**: 25/07/2026
> **Ràng buộc cứng**: ❌ **KHÔNG được thêm bất kỳ tính năng AI nào** (LLM, embedding, semantic search, "gợi ý thông minh"). Mọi thuật toán phải tất định.

---

## 📋 MỤC LỤC

| § | Nội dung |
|---|---|
| 0 | Quy tắc vận hành cho agent (ĐỌC TRƯỚC) |
| 1 | Thiết lập môi trường & 2 MCP |
| 2 | Bản đồ codebase & khởi tạo bộ nhớ Serena |
| 3 | **PHA 0** — Baseline: đo trước khi sửa |
| 4 | **PHA 1** — Vệ sinh repo & lưới an toàn (CI + test) |
| 5 | **PHA 2** — Schema Resolver: sửa 48 % sách chết |
| 6 | **PHA 3** — Chặn bẫy crawler & chuẩn hoá 404/503 |
| 7 | **PHA 4** — Caching, ISR & cắt over-fetch |
| 8 | **PHA 5** — SEO: sitemap index + og:image |
| 9 | **PHA 6** — Accessibility |
| 10 | **PHA 7** — Cắm PostgreSQL vào luồng thật |
| 11 | **PHA 8** — Đóng gói: E2E, ADR, README, metrics |
| 12 | Bảng nghiệm thu tổng (Definition of Done) |
| 13 | Chiến lược commit/PR & rollback |
| 14 | Phụ lục: lệnh kiểm chứng tái lập |

---

# §0 — QUY TẮC VẬN HÀNH CHO AGENT (ĐỌC TRƯỚC KHI GÕ DÒNG ĐẦU TIÊN)

## 0.1 Bảy luật bất di bất dịch

1. **KHÔNG tính năng AI.** Nếu một giải pháp cần LLM/embedding/vector search — **loại bỏ và tìm thuật toán tất định**. Tìm kiếm phải là `tsvector`/`pg_trgm`/Levenshtein, không phải semantic.
2. **Không sửa mù.** Trước mọi thay đổi symbol, **bắt buộc** chạy `mcp__gitnexus__impact` + `mcp__serena__find_referencing_symbols` để biết blast radius.
3. **Không đọc cả file khi chưa cần.** Dùng `mcp__serena__get_symbols_overview` → `find_symbol` trước; `read_file` là biện pháp cuối.
4. **Không suppress lint/type error.** Repo này có tiền lệ tốt: tác giả từng sửa `react-hooks/set-state-in-effect` bằng cách đổi pattern chứ không `// eslint-disable`. **Giữ chuẩn đó.**
5. **Mỗi pha = 1 commit (hoặc 1 PR).** Không mega-commit. Base commit `29a099f` của repo sửa 35 file/+2838 dòng — **đó là phản ví dụ**.
6. **Mỗi pha phải qua cổng nghiệm thu** mới được sang pha sau. Cổng có lệnh cụ thể ở cuối mỗi §.
7. **Ghi lại số đo thật.** Mọi con số trong `docs/metrics.md` phải do agent tự chạy lệnh mà ra, không copy từ plan này.

## 0.2 Phân vai 2 MCP — dùng cái nào khi nào

| Tình huống | Dùng | Lý do |
|---|---|---|
| "Hàm này ai gọi?" | `serena.find_referencing_symbols` | LSP chính xác, không false positive |
| "Đổi hàm này thì vỡ những gì?" | `gitnexus.impact` | Blast radius theo depth + confidence |
| "Route nào gọi API nào?" | `gitnexus.route_map` | Bản đồ component ↔ endpoint ↔ handler |
| "Từ A tới B đi qua đâu?" | `gitnexus.trace` | Đường dẫn có hướng ngắn nhất |
| "Tìm chỗ xử lý chương/verse" | `gitnexus.query` | Hybrid BM25 + RRF, gom theo process |
| "Xem cấu trúc file" | `serena.get_symbols_overview` | Rẻ token hơn đọc file |
| "Thay thân hàm" | `serena.replace_symbol_body` | Không đụng code xung quanh |
| "Thêm import / thêm hàm mới" | `serena.insert_before_symbol` / `insert_after_symbol` | Chèn đúng vị trí ngữ nghĩa |
| "Đổi tên xuyên repo" | `gitnexus.rename` | Graph + text search phối hợp |
| "Diff này ảnh hưởng gì?" | `gitnexus.detect_changes` | Map dòng đổi → process bị ảnh hưởng |
| "API trả về shape có khớp consumer?" | `gitnexus.shape_check` | Kiểm property access phía tiêu thụ |
| "Lưu quyết định cho phiên sau" | `serena.write_memory` | Bộ nhớ dự án dạng Markdown |
| "Kiểm lỗi biên dịch sau khi sửa" | `serena.get_diagnostics_for_file` | Nhanh hơn chạy build |

## 0.3 Vòng lặp chuẩn cho MỌI thay đổi code

```
1. gitnexus.query          → định vị vùng liên quan
2. serena.get_symbols_overview → hiểu cấu trúc file
3. serena.find_symbol      → đọc đúng symbol cần sửa
4. gitnexus.impact         → blast radius
5. serena.find_referencing_symbols → xác nhận call site
6. VIẾT TEST TRƯỚC (red)
7. serena.replace_symbol_body / insert_* → sửa
8. serena.get_diagnostics_for_file → kiểm type/lint tức thì
9. npm run lint && npm run typecheck && npm test → xanh (green)
10. gitnexus.detect_changes → xác nhận không rò rỉ ngoài dự kiến
11. serena.write_memory → ghi lại quyết định
12. git commit (scope hẹp, message có: vấn đề → cách sửa → cách verify)
```

---

# §1 — THIẾT LẬP MÔI TRƯỜNG & 2 MCP

## 1.1 Clone & chuẩn bị

```bash
git clone https://github.com/minhtai0611/israeli-inspired-3d-book-website.git sifria
cd sifria
git checkout -b fix/sifria-p0-hardening 392fd57
node -v            # cần >= 20
npm install
cp /dev/null .env
cat >> .env <<'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/app_db
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
npm run build      # xác nhận baseline build được
```

## 1.2 Cài & index GitNexus

```bash
npm install -g gitnexus
gitnexus index . --name sifria
# Xác nhận đã index:
gitnexus list-repos
```

Cấu hình MCP cho Claude Code (`.mcp.json` ở repo root — **nhớ để trong `.gitignore`**):

```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "gitnexus",
      "args": ["mcp"]
    },
    "serena": {
      "command": "uvx",
      "args": [
        "--from", "git+https://github.com/oraios/serena",
        "serena", "start-mcp-server",
        "--context", "ide-assistant",
        "--project", "."
      ]
    }
  }
}
```

## 1.3 Kích hoạt Serena & onboarding

```
mcp__serena__activate_project(project="/đường/dẫn/tuyệt/đối/sifria")
mcp__serena__onboarding()
mcp__serena__list_memories()
```

## 1.4 Kiểm tra 2 MCP đã sống

```
mcp__gitnexus__list_repos()
   → phải thấy "sifria"

mcp__gitnexus__query(repo="sifria", q="Sefaria API client fetch text")
   → phải trả về src/lib/sefaria.ts

mcp__serena__get_symbols_overview(relative_path="src/lib/sefaria.ts")
   → phải liệt kê: sefariaFetch, getIndex, getText, getBookIndex, cleanText, flatten
```

❌ Nếu bất kỳ lệnh nào ở trên fail → **DỪNG**, sửa cấu hình MCP trước. Không được fallback sang `grep` thủ công cho toàn bộ plan này.

---

# §2 — BẢN ĐỒ CODEBASE & KHỞI TẠO BỘ NHỚ SERENA

## 2.1 Khảo sát bằng GitNexus (chỉ đọc, chưa sửa gì)

```
mcp__gitnexus__route_map(repo="sifria")
mcp__gitnexus__context(repo="sifria", symbol="getText")
mcp__gitnexus__context(repo="sifria", symbol="getBookIndex")
mcp__gitnexus__impact(repo="sifria", symbol="sefariaFetch")
mcp__gitnexus__trace(repo="sifria", from="ReaderPage", to="sefariaFetch")
mcp__gitnexus__cypher(repo="sifria", query="
  MATCH (f:Function)-[:CALLS]->(g:Function {name:'getIndex'})
  RETURN f.name, f.file
")
```

## 2.2 Cấu trúc thực tế (đã xác minh)

```
src/
  app/
    page.tsx                      322 dòng · Home (RSC)
    layout.tsx                    131 · metadata + JSON-LD + fonts
    thu-vien/page.tsx             142 · liệt kê 14 category, mỗi cái slice(0,24)
    thu-vien/[category]/page.tsx   88 · truyền TOÀN BỘ mảng xuống client ⚠️
    tim-kiem/page.tsx             116 · search theo tên sách
    sach/[book]/page.tsx          201 · mục lục — GIẢ ĐỊNH mọi sách = mảng chương ⚠️
    doc/[book]/[chapter]/page.tsx 184 · reader
    sitemap.ts                     53 · 6615 URL, 0 URL /doc ⚠️
    robots.ts, manifest.ts, not-found.tsx
    api/health/route.ts            13 · file DUY NHẤT import @/db ⚠️
  components/
    reader/ReaderView.tsx         174 · "use client"
    reader/ContinueReading.tsx     47 · "use client"
    library/CategoryBrowser.tsx   122 · "use client" — PAGE_SIZE=24 ⚠️
    SearchForm.tsx, SiteHeader.tsx, SiteFooter.tsx, HeroOrbit.tsx,
    HebrewMarquee.tsx, Logo.tsx
  lib/
    sefaria.ts                    125 · client API
    library.ts                    115 · flattenBooks/groupByCategory/searchBooks
    reader-storage.ts             122 · useSyncExternalStore
    site.ts                        15 · SITE_URL
    vi.ts                         165 · 18/6598 sách có tên tiếng Việt
  db/schema.ts                     93 · 7 bảng — KHÔNG route nào đọc ⚠️
```

## 2.3 Ghi bộ nhớ Serena — 5 memory bắt buộc

```
mcp__serena__write_memory(memory_name="00-muc-tieu-va-rang-buoc", content="""
# Sifria — Mục tiêu đợt sửa
Base: 392fd57. Branch: fix/sifria-p0-hardening.
RÀNG BUỘC CỨNG: KHÔNG thêm tính năng AI. Mọi thuật toán phải tất định.
Mục tiêu: đưa scorecard 5.2 → 7.5+, làm link đủ an toàn để đưa vào CV.
8 pha, mỗi pha 1 commit, mỗi pha có cổng nghiệm thu.
""")

mcp__serena__write_memory(memory_name="01-kien-truc", content="""
# Kiến trúc Sifria
Next.js 16 App Router + React 19 + TS strict + Tailwind v4.
Data: Sefaria Open API (https://www.sefaria.org/api), KHÔNG có SDK.
DB: Drizzle + Postgres (Neon) — 7 bảng, HIỆN CHỈ /api/health dùng.
RSC-first: chỉ 3/12 component có "use client".
Deploy: Vercel, ISR qua export const revalidate.

## Điểm mạnh PHẢI GIỮ khi refactor
- sefariaFetch() chặn response HTTP-200-kèm-{error} của Sefaria (dòng ~52).
  KHÔNG được xoá guard này.
- src/lib/site.ts là nguồn sự thật DUY NHẤT cho mọi URL. Không hardcode domain.
- reader-storage.ts dùng useSyncExternalStore, KHÔNG dùng effect+setState
  (rule react-hooks/set-state-in-effect sẽ chặn).
- RSC-first: không tuỳ tiện thêm "use client".
""")

mcp__serena__write_memory(memory_name="02-loi-P0", content="""
# 5 lỗi P0 (đã xác minh bằng curl trên production)
P0-1  48% sách không đọc được. Mẫu 40/6598 → 19 hỏng.
      Gốc: sach/[book]/page.tsx giả định mọi sách là mảng chương tuyến tính.
      Sefaria có 3 kiểu địa chỉ: Integer / Talmud (daf 2a,2b) / complex (schema.nodes).
      Bằng chứng: /doc/Zohar/1 → 404; /doc/Berakhot/1 → 200 nhưng 0 câu.
P0-2  URL vô hạn + duplicate. /doc/Berakhot/999 → 200, nội dung TRÙNG /doc/Berakhot/2a,
      và tự khai canonical trỏ chính nó. /doc/Genesis/51 thì 404 đúng
      → hàng phòng thủ đang phụ thuộc hoàn toàn vào thiện chí upstream.
P0-3  /doc/** và /sach/** KHÔNG được cache: header 'private, no-cache, no-store',
      x-vercel-cache MISS 3/3 lần, dù code có revalidate=43200.
      Trong khi / và /thu-vien thì x-nextjs-prerender:1, HIT.
P0-4  0 test, 0 CI.
P0-5  4 file nhật ký AI (855 dòng) ở repo root + package.json tên
      "nextjs-postgresql-template".
""")

mcp__serena__write_memory(memory_name="03-loi-P1", content="""
# P1
- Không có error.tsx/loading.tsx → Sefaria sập ⇒ notFound() ⇒ soft-404 SAI SEMANTICS
  (phải là 503 + Retry-After).
- Không có og:image dù đã khai twitter:card=summary_large_image.
- Thiếu lang="he"/lang="en" trên câu kinh (chỉ có dir="rtl"). html lang="vi"
  ⇒ screen reader đọc Hebrew bằng giọng Việt.
- Tương phản: text-parchment/40 = 3.36:1 (FAIL). Nút copy-link #a37d1a@50% trên
  nền giấy #f4ead2 < 2:1 (FAIL nặng).
- Over-fetch: /thu-vien/Halakhah truyền 2169 object xuống client để hiện 24
  → HTML 556 KB thô.
- Sitemap 1.5MB / 6615 URL, sinh mới mỗi request (~1.5s), CHỨA 0 URL /doc.
- versionTitle: bản Hebrew hardcode "Miqra according to the Masorah" — SAI với Talmud
  (thực tế là "William Davidson Edition - Vocalized Aramaic").
- copyVerseLink catch{} rỗng → nuốt lỗi im lặng.
- Heading nhảy cóc: trang đọc h1 → h4.
- HebrewMarquee thiếu aria-hidden → SR đọc 44 ký tự Hebrew rời rạc.
- Không có LICENSE.
- fetch Sefaria /index = 3.99 MB > trần 2MB Data Cache ⇒ không bao giờ cache được.
""")

mcp__serena__write_memory(memory_name="04-tien-do", content="""
# Tiến độ
- [ ] PHA 0 Baseline
- [ ] PHA 1 Vệ sinh + CI + test
- [ ] PHA 2 Schema Resolver
- [ ] PHA 3 404/503 + chặn URL vô hạn
- [ ] PHA 4 Caching/ISR
- [ ] PHA 5 SEO
- [ ] PHA 6 A11y
- [ ] PHA 7 Postgres cutover
- [ ] PHA 8 Đóng gói
""")
```

---

# §3 — PHA 0: BASELINE (bắt buộc, KHÔNG sửa code)

> **Mục đích**: tạo ra con số "TRƯỚC" để Phần VII của biên bản (bullet CV) có căn cứ thật.

## 3.1 Viết script audit độ phủ

**Tạo `scripts/audit-coverage.ts`** — dùng `serena.insert_after_symbol` nếu file đã có, hoặc tạo mới:

```ts
/**
 * Đo tỷ lệ sách thực sự đọc được qua ĐƯỜNG ĐI CHÍNH mà người dùng sẽ đi:
 *   /sach/{title}  →  bấm "Đọc từ đầu"  →  /doc/{title}/1
 * Lấy mẫu ngẫu nhiên có seed cố định để tái lập được.
 *
 * Dùng: npx tsx scripts/audit-coverage.ts [baseUrl] [sampleSize]
 */
import "dotenv/config";
import { getIndex } from "../src/lib/sefaria";
import { flattenBooks } from "../src/lib/library";
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const N = Number(process.argv[3] ?? 200);
const SEED = 20260725;

/** PRNG tất định (mulberry32) — KHÔNG dùng Math.random để kết quả tái lập được */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Row = {
  title: string; category: string;
  sachStatus: number; docStatus: number; verses: number; ok: boolean;
};

async function main() {
  const books = flattenBooks(await getIndex());
  const rand = rng(SEED);
  const pool = [...books];
  const sample: typeof books = [];
  for (let i = 0; i < Math.min(N, pool.length); i++) {
    sample.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }

  const rows: Row[] = [];
  // Tuần tự hoá nhẹ để không đập Sefaria: 4 request song song tối đa
  const CHUNK = 4;
  for (let i = 0; i < sample.length; i += CHUNK) {
    const batch = sample.slice(i, i + CHUNK).map(async (b) => {
      const enc = encodeURIComponent(b.title);
      const s = await fetch(`${BASE}/sach/${enc}`).catch(() => null);
      const d = await fetch(`${BASE}/doc/${enc}/1`).catch(() => null);
      const html = d && d.ok ? await d.text() : "";
      const verses = (html.match(/class="verse /g) ?? []).length;
      rows.push({
        title: b.title,
        category: b.categoryPath[0] ?? "?",
        sachStatus: s?.status ?? 0,
        docStatus: d?.status ?? 0,
        verses,
        ok: d?.status === 200 && verses > 0,
      });
    });
    await Promise.all(batch);
  }

  const ok = rows.filter((r) => r.ok).length;
  const pct = ((ok / rows.length) * 100).toFixed(1);

  const byCat = new Map<string, { ok: number; total: number }>();
  for (const r of rows) {
    const e = byCat.get(r.category) ?? { ok: 0, total: 0 };
    e.total++; if (r.ok) e.ok++;
    byCat.set(r.category, e);
  }

  const md = [
    `# Báo cáo độ phủ nội dung đọc được`,
    ``,
    `- Base: \`${BASE}\``,
    `- Mẫu: **${rows.length}** / ${books.length} đầu sách (seed ${SEED}, tái lập được)`,
    `- Đọc được: **${ok}/${rows.length} = ${pct}%**`,
    `- Chạy lúc: ${new Date().toISOString()}`,
    ``,
    `## Theo bộ sưu tập`,
    ``,
    `| Bộ | Đọc được | Tổng | % |`,
    `|---|---|---|---|`,
    ...[...byCat.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([c, e]) => `| ${c} | ${e.ok} | ${e.total} | ${((e.ok / e.total) * 100).toFixed(0)}% |`),
    ``,
    `## Danh sách hỏng`,
    ``,
    `| Sách | Bộ | /sach | /doc/1 | Số câu |`,
    `|---|---|---|---|---|`,
    ...rows.filter((r) => !r.ok)
      .map((r) => `| ${r.title} | ${r.category} | ${r.sachStatus} | ${r.docStatus} | ${r.verses} |`),
  ].join("\n");

  writeFileSync("docs/coverage-report.md", md);
  console.log(`Đọc được ${ok}/${rows.length} = ${pct}%`);
  if (rows.length - ok > 0) process.exitCode = 0; // pha 0 chỉ đo, không fail
}

main();
```

Thêm script vào `package.json`:
```json
"audit:coverage": "tsx scripts/audit-coverage.ts"
```

## 3.2 Script đo hiệu năng

**Tạo `scripts/measure.sh`**:

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-https://israeli-inspired-3d-book-website.vercel.app}"
OUT="docs/metrics-raw.txt"
: > "$OUT"

echo "=== Đo lúc $(date -Iseconds) · base=$BASE ===" | tee -a "$OUT"

echo "--- Kích thước HTML (nén) ---" | tee -a "$OUT"
for u in / /thu-vien /thu-vien/Halakhah /thu-vien/Talmud /sach/Genesis /doc/Genesis/1; do
  s=$(curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w '%{size_download}' "$BASE$u")
  r=$(curl -s -o /dev/null -w '%{size_download}' "$BASE$u")
  printf "%-28s nen=%-8s tho=%s\n" "$u" "$s" "$r" | tee -a "$OUT"
done

echo "--- Header cache ---" | tee -a "$OUT"
for u in / /thu-vien /sach/Genesis /doc/Genesis/1 /doc/Psalms/23; do
  h=$(curl -sI "$BASE$u" | grep -iE 'x-vercel-cache|x-nextjs-prerender' | tr -d '\r' | tr '\n' ' ')
  printf "%-28s %s\n" "$u" "$h" | tee -a "$OUT"
done

echo "--- TTFB (20 lần, /doc/Genesis/1) ---" | tee -a "$OUT"
for i in $(seq 1 20); do
  curl -s -o /dev/null -w '%{time_total}\n' "$BASE/doc/Genesis/1"
done | sort -n | awk '{a[NR]=$1} END {printf "p50=%.3fs p95=%.3fs\n", a[int(NR*0.5)], a[int(NR*0.95)]}' | tee -a "$OUT"

echo "--- JS bundle trang chủ (nén) ---" | tee -a "$OUT"
curl -s "$BASE/" -o /tmp/_home.html
tot=0; n=0
for j in $(grep -oE '/_next/static/[^"]+\.js' /tmp/_home.html | sort -u); do
  s=$(curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w '%{size_download}' "$BASE$j")
  tot=$((tot+s)); n=$((n+1))
done
echo "chunks=$n total_compressed=${tot}B" | tee -a "$OUT"

echo "--- Sitemap ---" | tee -a "$OUT"
sm=$(curl -s -o /tmp/_sm.xml -w '%{size_download} %{time_total}' "$BASE/sitemap.xml")
echo "size_time=$sm urls=$(grep -c '<loc>' /tmp/_sm.xml) doc_urls=$(grep -c 'doc/' /tmp/_sm.xml)" | tee -a "$OUT"

echo "--- URL vô hạn (bẫy crawler) ---" | tee -a "$OUT"
for c in 129 130 200 999 5000; do
  printf "  /doc/Berakhot/%-6s " "$c"
  curl -s -o /tmp/_b.html -w '%{http_code} ' "$BASE/doc/Berakhot/$c"
  echo "verses=$(grep -o 'class=\"verse ' /tmp/_b.html | wc -l)"
done | tee -a "$OUT"

echo "--- npm audit ---" | tee -a "$OUT"
npm audit --package-lock-only 2>&1 | tail -3 | tee -a "$OUT"
```

## 3.3 Chạy baseline

```bash
chmod +x scripts/measure.sh
mkdir -p docs
npm run build && npm run start &   # hoặc đo thẳng production
sleep 5
npm run audit:coverage -- https://israeli-inspired-3d-book-website.vercel.app 200
./scripts/measure.sh https://israeli-inspired-3d-book-website.vercel.app
cp docs/coverage-report.md docs/coverage-report.BASELINE.md
cp docs/metrics-raw.txt   docs/metrics-raw.BASELINE.txt
```

## ✅ CỔNG NGHIỆM THU PHA 0

- [ ] `docs/coverage-report.BASELINE.md` tồn tại, có con số % thật
- [ ] `docs/metrics-raw.BASELINE.txt` tồn tại
- [ ] Con số coverage nằm trong khoảng **45–60 %** (nếu > 80 % → script sai, kiểm lại `class="verse `)

```
mcp__serena__write_memory(memory_name="05-baseline", content="""
# Baseline đo được (điền số THẬT sau khi chạy)
- Coverage: __/200 = __%
- HTML /thu-vien/Halakhah: __ KB nén / __ KB thô
- x-vercel-cache /doc/Genesis/1: __
- p95 TTFB /doc/Genesis/1: __ s
- JS trang chủ: __ chunk, __ B nén
- Sitemap: __ URL, __ KB, __ URL /doc
- npm audit: __ 
""")
```

**Commit**: `chore(audit): add coverage + performance measurement scripts and baseline report`

---

# §4 — PHA 1: VỆ SINH REPO & LƯỚI AN TOÀN

> **ROI cao nhất toàn plan.** ~1 ngày công, gỡ bỏ 2 câu hỏi giết CV.

## 4.1 Dọn repo (30 phút)

```bash
mkdir -p docs/process
git mv CLAUDECODE_SIFRIA_end_to_end_fix_plan.md docs/process/ 2>/dev/null || true
git mv CHANGELOG_SIFRIA_FIXES.md                docs/process/ 2>/dev/null || true
git mv EXECUTION_PROGRESS.md                    docs/process/ 2>/dev/null || true
git mv RECOVERY_STATE.md                        docs/process/ 2>/dev/null || true
```

**Sửa `package.json`** (`serena.replace_lines` hoặc edit trực tiếp):
```diff
-  "name": "nextjs-postgresql-template",
+  "name": "sifria",
+  "version": "0.1.0",
+  "description": "Thư viện đọc song ngữ Hebrew–Anh với giao diện tiếng Việt, dữ liệu từ Sefaria Open API",
```

**Tạo `LICENSE`** (MIT) + thêm mục vào README:

```markdown
## License

Code: MIT (xem `LICENSE`).

Nội dung văn bản **không** thuộc bản quyền của dự án này:
- Bản Hebrew: *Miqra according to the Masorah* — CC-BY-SA
- Bản dịch tiếng Anh & metadata: cung cấp qua [Sefaria](https://www.sefaria.org)
  Open API theo giấy phép tương ứng của từng phiên bản.

Sifria không sửa đổi hay diễn giải lại văn bản gốc.
```

## 4.2 Cài hạ tầng test

```bash
npm i -D vitest @vitest/coverage-v8
```

**`vitest.config.ts`**:
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    coverage: { provider: "v8", reporter: ["text", "json-summary"] },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

`package.json`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage"
```

## 4.3 Bộ test tối thiểu (15 test)

**`tests/unit/library.test.ts`** — trước khi viết, dùng Serena để đọc đúng signature:
```
mcp__serena__find_symbol(name_path="flattenBooks", relative_path="src/lib/library.ts", include_body=true)
mcp__serena__find_symbol(name_path="searchBooks", relative_path="src/lib/library.ts", include_body=true)
```

```ts
import { describe, it, expect } from "vitest";
import {
  flattenBooks, groupByCategory, sortCategories,
  categorySlug, categoryFromSlug, searchBooks, CATEGORY_ORDER,
} from "@/lib/library";
import type { IndexNode } from "@/lib/sefaria";

const FIXTURE: IndexNode[] = [
  {
    category: "Tanakh",
    contents: [
      { category: "Torah", contents: [
        { title: "Genesis", heTitle: "בראשית", categories: ["Tanakh", "Torah"] },
        { title: "Exodus",  heTitle: "שמות",   categories: ["Tanakh", "Torah"] },
      ]},
      { title: "Psalms", heTitle: "תהילים", categories: ["Tanakh", "Writings"] },
    ],
  },
  { category: "Talmud", contents: [
    { title: "Berakhot", heTitle: "ברכות", categories: ["Talmud", "Bavli"] },
  ]},
];

describe("flattenBooks", () => {
  it("làm phẳng cây lồng nhau thành danh sách sách", () => {
    const b = flattenBooks(FIXTURE);
    expect(b.map((x) => x.title).sort()).toEqual(["Berakhot", "Exodus", "Genesis", "Psalms"]);
  });
  it("giữ nguyên categoryPath từ node", () => {
    const g = flattenBooks(FIXTURE).find((x) => x.title === "Genesis")!;
    expect(g.categoryPath[0]).toBe("Tanakh");
  });
  it("fallback heTitle về title khi thiếu", () => {
    expect(flattenBooks([{ title: "X" }])[0].heTitle).toBe("X");
  });
});

describe("groupByCategory + sortCategories", () => {
  it("gom đúng theo category gốc", () => {
    const g = groupByCategory(flattenBooks(FIXTURE));
    expect(g.get("Tanakh")).toHaveLength(3);
    expect(g.get("Talmud")).toHaveLength(1);
  });
  it("sắp theo CATEGORY_ORDER, cái lạ xuống cuối", () => {
    const s = sortCategories([["Talmud", 1], ["Tanakh", 1], ["Zzz", 1]] as [string, number][]);
    expect(s.map(([k]) => k)).toEqual(["Tanakh", "Talmud", "Zzz"]);
  });
});

describe("categorySlug ↔ categoryFromSlug", () => {
  it("round-trip cho mọi category trong CATEGORY_ORDER", () => {
    for (const c of CATEGORY_ORDER) {
      expect(categoryFromSlug(categorySlug(c), CATEGORY_ORDER)).toBe(c);
    }
  });
  it("Jewish Thought → Jewish-Thought", () => {
    expect(categorySlug("Jewish Thought")).toBe("Jewish-Thought");
  });
});

describe("searchBooks", () => {
  const books = flattenBooks(FIXTURE);
  it("khớp tên tiếng Anh", () => {
    expect(searchBooks(books, "genesis")[0].title).toBe("Genesis");
  });
  it("khớp tên tiếng Việt qua vi.ts", () => {
    expect(searchBooks(books, "Thi Thiên")[0].title).toBe("Psalms");
  });
  it("bỏ dấu tiếng Việt vẫn khớp", () => {
    expect(searchBooks(books, "thi thien")[0].title).toBe("Psalms");
  });
  it("khớp tiếng Hebrew", () => {
    expect(searchBooks(books, "בראשית")[0].title).toBe("Genesis");
  });
  it("query rỗng trả mảng rỗng", () => {
    expect(searchBooks(books, "   ")).toEqual([]);
  });
  it("tôn trọng limit", () => {
    expect(searchBooks(books, "a", 2).length).toBeLessThanOrEqual(2);
  });
});
```

**`tests/unit/sefaria.test.ts`**:
```ts
import { describe, it, expect } from "vitest";
import { cleanText, flatten } from "@/lib/sefaria";

describe("cleanText", () => {
  it("bỏ thẻ sup (chú thích)", () => {
    expect(cleanText("Trong <sup class='footnote-marker'>a</sup>ban đầu")).toBe("Trong ban đầu");
  });
  it("bỏ mọi thẻ HTML", () => {
    expect(cleanText("<b>Hello</b> <i>world</i>")).toBe("Hello world");
  });
  it("giải mã &nbsp; &amp; &thinsp;", () => {
    expect(cleanText("a&nbsp;b&amp;c&thinsp;d")).toBe("a b&c d");
  });
  it("gộp khoảng trắng thừa", () => {
    expect(cleanText("  a    b  ")).toBe("a b");
  });
});

describe("flatten", () => {
  it("làm phẳng mảng 2 chiều", () => {
    expect(flatten([["a", "b"], ["c"]])).toEqual(["a", "b", "c"]);
  });
  it("giữ nguyên mảng 1 chiều", () => {
    expect(flatten(["a", "b"])).toEqual(["a", "b"]);
  });
  it("loại phần tử rỗng", () => {
    expect(flatten(["a", "", "b"])).toEqual(["a", "b"]);
  });
});
```

**`tests/unit/hebrew-numeral.test.ts`** — bug tiềm ẩn thú vị:
> `toHebrewNumeral` hiện là hàm private trong `sach/[book]/page.tsx`. **Trích xuất ra `src/lib/hebrew-numeral.ts`** bằng `serena.find_symbol` + `insert_before_symbol`, rồi test:

```ts
import { describe, it, expect } from "vitest";
import { toHebrewNumeral } from "@/lib/hebrew-numeral";

describe("toHebrewNumeral", () => {
  it.each([
    [1, "א"], [2, "ב"], [10, "י"], [11, "יא"],
    [15, "טו"],   // ĐẶC BIỆT: KHÔNG phải יה (tránh viết tắt danh Chúa)
    [16, "טז"],   // ĐẶC BIỆT: KHÔNG phải יו
    [20, "כ"], [100, "ק"], [400, "ת"], [500, "תק"],
  ])("%i → %s", (n, expected) => {
    expect(toHebrewNumeral(n)).toBe(expected);
  });

  it("không sinh ra יה hay יו cho 15/16", () => {
    expect(toHebrewNumeral(15)).not.toBe("יה");
    expect(toHebrewNumeral(16)).not.toBe("יו");
  });

  it("mọi số 1..600 đều trả chuỗi không rỗng", () => {
    for (let i = 1; i <= 600; i++) expect(toHebrewNumeral(i).length).toBeGreaterThan(0);
  });
});
```

## 4.4 CI GitHub Actions

**`.github/workflows/ci.yml`**:
```yaml
name: CI
on:
  push: { branches: [master, "fix/**", "feat/**"] }
  pull_request: { branches: [master] }

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: npm }
      - run: npm ci
      - name: Lint
        run: npm run lint
      - name: Typecheck
        run: npm run typecheck
      - name: Unit tests
        run: npm run test:cov
      - name: Security audit (chặn HIGH)
        run: npm audit --audit-level=high
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: postgresql://user:pass@localhost:5432/db
          NEXT_PUBLIC_SITE_URL: https://example.com
```

Thêm badge vào đầu README:
```markdown
[![CI](https://github.com/minhtai0611/sifria-bilingual-reader/actions/workflows/ci.yml/badge.svg)](https://github.com/minhtai0611/sifria-bilingual-reader/actions/workflows/ci.yml)
```

## 4.5 Error/Loading boundaries

**`src/app/error.tsx`**:
```tsx
"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[sifria]", error); }, [error]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-hebrew text-4xl text-[#d4af37]" dir="rtl" lang="he">שגיאה</p>
      <h1 className="mt-4 font-display text-3xl text-parchment">Có trục trặc khi tải trang</h1>
      <p className="mt-3 text-parchment/70">
        Nguồn văn bản (Sefaria) có thể đang tạm thời không phản hồi. Bạn thử lại sau ít phút nhé.
      </p>
      <button onClick={reset} className="btn-gold mt-8">Thử lại</button>
    </div>
  );
}
```

**`src/app/doc/[book]/[chapter]/loading.tsx`** + **`src/app/sach/[book]/loading.tsx`**: skeleton nền giấy (dùng `.parchment`, `animate-pulse`, và **phải** tôn trọng `prefers-reduced-motion` đã có trong `globals.css`).

## ✅ CỔNG NGHIỆM THU PHA 1

```bash
npm run lint       # 0 error
npm run typecheck  # 0 error
npm run test       # >= 15 test PASS
npm run build      # thành công
ls LICENSE .github/workflows/ci.yml
ls *.md            # CHỈ còn README.md ở root
grep '"name"' package.json   # phải là "sifria"
```

- [ ] CI xanh trên GitHub, badge hiện trong README
- [ ] `find src -name "error.tsx" -o -name "loading.tsx"` trả về ≥ 3 file

```
mcp__serena__write_memory(memory_name="04-tien-do", content="... [x] PHA 1 ...")
```

**Commit**: `chore: clean repo root, add MIT license, Vitest suite (18 tests) and GitHub Actions CI`

---

# §5 — PHA 2: SCHEMA RESOLVER — SỬA 48 % SÁCH CHẾT

> **Lỗi P0 nghiêm trọng nhất.** Đây là lỗi **mô hình hoá dữ liệu**, không phải lỗi vặt.

## 5.1 Khảo sát blast radius TRƯỚC khi sửa

```
mcp__gitnexus__context(repo="sifria", symbol="getBookIndex")
mcp__gitnexus__impact(repo="sifria", symbol="getBookIndex", depth=3)
mcp__gitnexus__trace(repo="sifria", from="BookPage", to="getBookIndex")
mcp__serena__find_referencing_symbols(name_path="getBookIndex", relative_path="src/lib/sefaria.ts")
mcp__serena__find_symbol(name_path="BookPage", relative_path="src/app/sach/[book]/page.tsx", include_body=true)
```

**Ghi lại danh sách call site vào memory trước khi sửa.**

## 5.2 Hiểu 3 kiểu địa chỉ của Sefaria

Chạy thăm dò để tự xác nhận (KHÔNG tin plan này, tự chạy):

```bash
curl -s 'https://www.sefaria.org/api/v2/raw/index/Genesis'  | python3 -m json.tool | head -40
curl -s 'https://www.sefaria.org/api/v2/raw/index/Berakhot' | python3 -m json.tool | head -40
curl -s 'https://www.sefaria.org/api/v2/raw/index/Zohar'    | python3 -m json.tool | head -60
curl -s 'https://www.sefaria.org/api/texts/Zohar'           | head -c 300
# → {"error": "... 'Zohar' is a 'complex' book-level ref ..."}
```

| `schema.addressTypes[0]` | Kiểu | Sinh mục lục | Nhãn hiển thị |
|---|---|---|---|
| `Integer` | simple | `1..lengths[0]` | "Chương n" |
| `Talmud` | daf/amud | `2a, 2b, 3a, …` | "Daf 2a · דף ב׳ ע״א" |
| có `schema.nodes` | complex | **cây đệ quy**, mỗi lá là ref hợp lệ | tên node + nhãn Việt |

## 5.3 Tạo `src/lib/schema-resolver.ts`

```ts
/**
 * BỘ GIẢI CẤU TRÚC SÁCH (Schema Resolver)
 *
 * Vấn đề gốc: mã trước đây giả định MỌI sách Sefaria là một mảng chương tuyến tính
 * (Array.from({length: lengths[0]})). Thực tế Sefaria có 3 kiểu địa chỉ khác nhau,
 * và giả định sai đó làm 48% catalogue không đọc được qua đường đi chính
 * (đo bằng scripts/audit-coverage.ts, mẫu ngẫu nhiên có seed).
 *
 * Module này KHÔNG suy diễn dữ liệu — nó chỉ đọc `schema.addressTypes` và
 * `schema.nodes` mà Sefaria đã khai báo, rồi sinh ref đúng cú pháp.
 */
import type { BookIndex } from "./sefaria";

export type KieuDiaChi = "integer" | "talmud" | "complex" | "unknown";

export interface MucLucItem {
  /** Ref đầy đủ để gọi Sefaria, vd "Genesis 1" | "Berakhot 2a" | "Zohar, Hakdamat Sefer HaZohar 1" */
  ref: string;
  /** Phần địa chỉ dùng cho URL /doc/{book}/{segment} */
  segment: string;
  /** Nhãn hiển thị tiếng Việt */
  nhan: string;
  /** Nhãn Hebrew (nếu có) */
  nhanHe?: string;
  /** Độ sâu trong cây (0 = gốc) — dùng để render cây lồng nhau */
  depth: number;
}

export interface CauTrucSach {
  kieu: KieuDiaChi;
  /** Nhãn đơn vị: "Chương" | "Daf" | "Phần" */
  donVi: string;
  donViHe?: string;
  items: MucLucItem[];
  /** Ref hợp lệ đầu tiên — nút "Đọc từ đầu" PHẢI dùng cái này, không phải "1" cứng */
  refDauTien: string | null;
  segmentDauTien: string | null;
}

/** Sefaria đánh số daf từ 2a (không có daf 1) */
export function dafTuChiSo(i: number): string {
  const daf = Math.floor(i / 2) + 2;
  return `${daf}${i % 2 === 0 ? "a" : "b"}`;
}

export function chiSoTuDaf(daf: string): number | null {
  const m = /^(\d+)([ab])$/.exec(daf.trim());
  if (!m) return null;
  return (Number(m[1]) - 2) * 2 + (m[2] === "a" ? 0 : 1);
}

/** Số Hebrew cho nhãn daf: 2 → ב׳ */
function heDaf(daf: string): string {
  const m = /^(\d+)([ab])$/.exec(daf);
  if (!m) return daf;
  const amud = m[2] === "a" ? "ע״א" : "ע״ב";
  return `${soHebrew(Number(m[1]))}׳ ${amud}`;
}

/** Chuyển 1..~600 sang số Hebrew. 15→טו, 16→טז (KHÔNG dùng יה/יו). */
export function soHebrew(n: number): string {
  if (n <= 0) return String(n);
  const map: [number, string][] = [
    [400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"],
    [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"],
    [40, "מ"], [30, "ל"], [20, "כ"],
    [19, "יט"], [18, "יח"], [17, "יז"], [16, "טז"], [15, "טו"],
    [10, "י"], [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"],
    [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"],
  ];
  let s = "", v = n;
  for (const [num, letter] of map) while (v >= num) { s += letter; v -= num; }
  return s || String(n);
}

export function nhanDienKieu(index: BookIndex): KieuDiaChi {
  const s = index.schema as (BookIndex["schema"] & { nodes?: unknown[]; addressTypes?: string[] }) | undefined;
  if (s?.nodes && Array.isArray(s.nodes) && s.nodes.length > 0) return "complex";
  const at = s?.addressTypes?.[0] ?? "";
  if (/talmud/i.test(at)) return "talmud";
  if (/integer/i.test(at)) return "integer";
  // Fallback: có lengths ⇒ coi như integer
  if ((index.lengths?.[0] ?? s?.lengths?.[0] ?? 0) > 0) return "integer";
  return "unknown";
}

interface NodeThô {
  title?: string;
  heTitle?: string;
  nodes?: NodeThô[];
  addressTypes?: string[];
  lengths?: number[];
  depth?: number;
  nodeType?: string;
}

/** Duyệt cây schema.nodes, sinh ref hợp lệ cho từng lá */
function duyetCay(nodes: NodeThô[], tienTo: string, depth: number, out: MucLucItem[]): void {
  for (const n of nodes) {
    const tieuDe = n.title ?? "";
    const refNode = tieuDe ? `${tienTo}, ${tieuDe}` : tienTo;
    if (n.nodes?.length) {
      out.push({ ref: refNode, segment: encodeURIComponent(refNode), nhan: tieuDe, nhanHe: n.heTitle, depth });
      duyetCay(n.nodes, refNode, depth + 1, out);
    } else {
      const len = n.lengths?.[0] ?? 0;
      const laTalmud = /talmud/i.test(n.addressTypes?.[0] ?? "");
      if (len > 0) {
        for (let i = 0; i < len; i++) {
          const seg = laTalmud ? dafTuChiSo(i) : String(i + 1);
          const ref = `${refNode} ${seg}`;
          out.push({
            ref,
            segment: encodeURIComponent(ref),
            nhan: laTalmud ? `Daf ${seg}` : `${tieuDe || "Phần"} ${i + 1}`,
            nhanHe: laTalmud ? heDaf(seg) : soHebrew(i + 1),
            depth: depth + 1,
          });
        }
      } else {
        out.push({ ref: refNode, segment: encodeURIComponent(refNode), nhan: tieuDe || "Phần", nhanHe: n.heTitle, depth });
      }
    }
  }
}

export function giaiCauTruc(index: BookIndex): CauTrucSach {
  const kieu = nhanDienKieu(index);
  const s = index.schema as (BookIndex["schema"] & { nodes?: NodeThô[] }) | undefined;
  const items: MucLucItem[] = [];

  if (kieu === "talmud") {
    const len = index.lengths?.[0] ?? s?.lengths?.[0] ?? 0;
    for (let i = 0; i < len; i++) {
      const seg = dafTuChiSo(i);
      items.push({
        ref: `${index.title} ${seg}`,
        segment: seg,
        nhan: `Daf ${seg}`,
        nhanHe: heDaf(seg),
        depth: 0,
      });
    }
    const first = items[0]?.segment ?? null;
    return { kieu, donVi: "Daf", donViHe: "דף", items, refDauTien: items[0]?.ref ?? null, segmentDauTien: first };
  }

  if (kieu === "complex" && s?.nodes) {
    duyetCay(s.nodes, index.title, 0, items);
    const la = items.find((i) => /\s\S+$/.test(i.ref) && i.depth > 0) ?? items[0];
    return {
      kieu, donVi: "Phần", donViHe: "חלק", items,
      refDauTien: la?.ref ?? null,
      segmentDauTien: la?.segment ?? null,
    };
  }

  if (kieu === "integer") {
    const len = index.lengths?.[0] ?? s?.lengths?.[0] ?? 0;
    for (let i = 1; i <= len; i++) {
      items.push({
        ref: `${index.title} ${i}`,
        segment: String(i),
        nhan: `Chương ${i}`,
        nhanHe: soHebrew(i),
        depth: 0,
      });
    }
    return {
      kieu, donVi: index.sectionNames?.[0] === "Chapter" ? "Chương" : (index.sectionNames?.[0] ?? "Chương"),
      donViHe: s?.heSectionNames?.[0],
      items, refDauTien: items[0]?.ref ?? null, segmentDauTien: items[0]?.segment ?? null,
    };
  }

  return { kieu: "unknown", donVi: "Phần", items: [], refDauTien: null, segmentDauTien: null };
}

/** Kiểm tra một segment có nằm trong cấu trúc hợp lệ không — dùng để chặn URL bịa */
export function segmentHopLe(ct: CauTrucSach, segment: string): boolean {
  const s = decodeURIComponent(segment);
  return ct.items.some((i) => i.segment === segment || i.segment === encodeURIComponent(s) || i.ref.endsWith(` ${s}`));
}
```

## 5.4 Test schema-resolver TRƯỚC khi cắm vào page

**`tests/unit/schema-resolver.test.ts`**:
```ts
import { describe, it, expect } from "vitest";
import { dafTuChiSo, chiSoTuDaf, soHebrew, nhanDienKieu, giaiCauTruc, segmentHopLe } from "@/lib/schema-resolver";
import type { BookIndex } from "@/lib/sefaria";

describe("đánh số daf", () => {
  it("bắt đầu từ 2a, không có daf 1", () => {
    expect(dafTuChiSo(0)).toBe("2a");
    expect(dafTuChiSo(1)).toBe("2b");
    expect(dafTuChiSo(2)).toBe("3a");
  });
  it("round-trip daf ↔ chỉ số", () => {
    for (let i = 0; i < 300; i++) expect(chiSoTuDaf(dafTuChiSo(i))).toBe(i);
  });
  it("từ chối daf sai định dạng", () => {
    expect(chiSoTuDaf("1")).toBeNull();
    expect(chiSoTuDaf("2c")).toBeNull();
  });
});

describe("soHebrew", () => {
  it("15 → טו và 16 → טז (không dùng יה/יו)", () => {
    expect(soHebrew(15)).toBe("טו");
    expect(soHebrew(16)).toBe("טז");
  });
  it("mọi n 1..600 đều ra chuỗi khác rỗng", () => {
    for (let n = 1; n <= 600; n++) expect(soHebrew(n)).not.toBe("");
  });
});

const GENESIS = { title: "Genesis", heTitle: "בראשית", categories: ["Tanakh"], sectionNames: ["Chapter"],
  lengths: [50], schema: { addressTypes: ["Integer", "Integer"], lengths: [50] } } as unknown as BookIndex;

const BERAKHOT = { title: "Berakhot", heTitle: "ברכות", categories: ["Talmud"], sectionNames: ["Daf", "Line"],
  lengths: [128], schema: { addressTypes: ["Talmud", "Integer"], lengths: [128] } } as unknown as BookIndex;

const ZOHAR = { title: "Zohar", heTitle: "זהר", categories: ["Kabbalah"], sectionNames: [],
  schema: { nodes: [
    { title: "Hakdamat Sefer HaZohar", heTitle: "הקדמת ספר הזהר", addressTypes: ["Integer"], lengths: [12] },
    { title: "Bereshit", heTitle: "בראשית", nodes: [
      { title: "Part 1", addressTypes: ["Integer"], lengths: [5] },
    ]},
  ]} } as unknown as BookIndex;

describe("nhanDienKieu", () => {
  it("Genesis → integer", () => expect(nhanDienKieu(GENESIS)).toBe("integer"));
  it("Berakhot → talmud", () => expect(nhanDienKieu(BERAKHOT)).toBe("talmud"));
  it("Zohar → complex",   () => expect(nhanDienKieu(ZOHAR)).toBe("complex"));
});

describe("giaiCauTruc", () => {
  it("Genesis sinh 50 chương, ref đầu = 'Genesis 1'", () => {
    const c = giaiCauTruc(GENESIS);
    expect(c.items).toHaveLength(50);
    expect(c.refDauTien).toBe("Genesis 1");
    expect(c.donVi).toBe("Chapter");
  });

  it("Berakhot KHÔNG sinh segment '1' (đây chính là bug cũ)", () => {
    const c = giaiCauTruc(BERAKHOT);
    expect(c.items.some((i) => i.segment === "1")).toBe(false);
    expect(c.segmentDauTien).toBe("2a");
    expect(c.refDauTien).toBe("Berakhot 2a");
    expect(c.donVi).toBe("Daf");
  });

  it("Zohar sinh ref có tên node, không phải 'Zohar 1'", () => {
    const c = giaiCauTruc(ZOHAR);
    expect(c.refDauTien).not.toBe("Zohar 1");
    expect(c.refDauTien).toContain("Hakdamat");
    expect(c.items.length).toBeGreaterThan(12);
  });

  it("mọi item đều có ref khác rỗng và segment encode được", () => {
    for (const idx of [GENESIS, BERAKHOT, ZOHAR]) {
      for (const it of giaiCauTruc(idx).items) {
        expect(it.ref.trim()).not.toBe("");
        expect(() => decodeURIComponent(it.segment)).not.toThrow();
      }
    }
  });
});

describe("segmentHopLe — chặn URL bịa", () => {
  it("Berakhot: 2a hợp lệ, 999 KHÔNG hợp lệ", () => {
    const c = giaiCauTruc(BERAKHOT);
    expect(segmentHopLe(c, "2a")).toBe(true);
    expect(segmentHopLe(c, "999")).toBe(false);
    expect(segmentHopLe(c, "1")).toBe(false);
  });
  it("Genesis: 50 hợp lệ, 51 KHÔNG", () => {
    const c = giaiCauTruc(GENESIS);
    expect(segmentHopLe(c, "50")).toBe(true);
    expect(segmentHopLe(c, "51")).toBe(false);
  });
});
```

## 5.5 Cắm vào `sach/[book]/page.tsx`

```
mcp__serena__find_symbol(name_path="BookPage", relative_path="src/app/sach/[book]/page.tsx", include_body=true)
mcp__serena__replace_symbol_body(name_path="BookPage", relative_path="src/app/sach/[book]/page.tsx", body="<thân mới>")
```

Thay đổi cốt lõi:
```diff
- let chapterCount = index.lengths?.[0] ?? index.schema?.lengths?.[0] ?? 0;
- ... Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
-     <Link href={`/doc/${encodeURIComponent(title)}/${ch}`}>Chương {ch}</Link>
+ const cauTruc = giaiCauTruc(index);
+ ... cauTruc.items.map((it) => (
+     <Link href={`/doc/${encodeURIComponent(title)}/${it.segment}`}>
+       <span className="font-hebrew" dir="rtl" lang="he">{it.nhanHe}</span>
+       <span>{it.nhan}</span>
+     </Link>

- <Link href={`/doc/${encodeURIComponent(title)}/1`}>Đọc từ đầu</Link>
+ {cauTruc.segmentDauTien && (
+   <Link href={`/doc/${encodeURIComponent(title)}/${cauTruc.segmentDauTien}`}>Đọc từ đầu</Link>
+ )}
```

**Với sách complex**: khi `items.length > 300` hoặc `kieu === "complex"`, render **combobox tìm nhanh** (client component nhỏ) thay vì lưới. Ví dụ `Shulchan Arukh, Orach Chayim` có **699 mục** — lưới 699 ô là UX tồi.

## 5.6 Xác nhận không rò rỉ

```
mcp__gitnexus__detect_changes(repo="sifria")
mcp__serena__get_diagnostics_for_file(relative_path="src/app/sach/[book]/page.tsx")
mcp__gitnexus__impact(repo="sifria", symbol="giaiCauTruc")
```

## ✅ CỔNG NGHIỆM THU PHA 2

```bash
npm run test    # test schema-resolver PASS
npm run build && npm run start &
sleep 5
npm run audit:coverage -- http://localhost:3000 200
```

- [ ] **Coverage ≥ 95 %** (baseline ~52 %)
- [ ] `/sach/Berakhot` → link đầu tiên là `/doc/Berakhot/2a`, **không** phải `/doc/Berakhot/1`
- [ ] `/sach/Zohar` → nút "Đọc từ đầu" trỏ tới ref hợp lệ, **200 có nội dung**
- [ ] `/sach/Guide%20for%20the%20Perplexed` → tương tự
- [ ] Nhãn Talmud là "Daf 2a", **không** phải "Chương 1"

```bash
curl -s http://localhost:3000/sach/Berakhot | grep -oE 'href="/doc/Berakhot/[^"]*"' | head -3
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/doc/Zohar/...
```

**Commit**: `fix(reader): resolve Sefaria's three address schemas (integer/talmud/complex)`

---

# §6 — PHA 3: CHẶN BẪY CRAWLER & CHUẨN HOÁ 404/503

## 6.1 Vấn đề

```
/doc/Berakhot/129 → 200, 14 câu
/doc/Berakhot/999 → 200, 14 câu ← TRÙNG, tự khai canonical trỏ chính nó
/doc/Genesis/51   → 404 ✅ (nhưng chỉ vì Sefaria tình cờ trả error)
```

Hàng phòng thủ đang **phụ thuộc hoàn toàn vào upstream**.

## 6.2 Validate biên ở tầng app

Trong `src/app/doc/[book]/[chapter]/page.tsx`:

```ts
const index = await getBookIndex(title).catch(() => null);
if (!index) notFound();

const cauTruc = giaiCauTruc(index);

// 1) Segment phải nằm trong cấu trúc đã khai báo — chặn URL bịa
if (!segmentHopLe(cauTruc, chapter)) notFound();

const data = await getText(ref);

// 2) Sefaria đôi khi "khoan dung" clamp về đoạn cuối thay vì báo lỗi.
//    Nếu ref trả về KHÁC ref đã yêu cầu ⇒ đây là URL không tồn tại thật.
if (data.sectionRef && normalizeRef(data.sectionRef) !== normalizeRef(ref)) {
  notFound();
}
```

Với `normalizeRef` (đặt trong `schema-resolver.ts`, có test):
```ts
export function normalizeRef(r: string): string {
  return r.trim().replace(/\s+/g, " ").toLowerCase();
}
```

## 6.3 Phân biệt 404 (không tồn tại) với 503 (upstream lỗi)

Sửa `sefariaFetch` để **phân loại lỗi** thay vì ném chung:

```
mcp__serena__find_symbol(name_path="sefariaFetch", relative_path="src/lib/sefaria.ts", include_body=true)
mcp__serena__replace_symbol_body(...)
```

```ts
export class SefariaKhongTonTai extends Error {}
export class SefariaLoiHeThong extends Error {}

async function sefariaFetch<T>(path: string, revalidate = 60 * 60 * 6): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SEFARIA_BASE}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    // Timeout / lỗi mạng ⇒ KHÔNG phải "không tồn tại"
    throw new SefariaLoiHeThong(`Không gọi được Sefaria ${path}: ${String(e)}`);
  }

  if (res.status === 404) throw new SefariaKhongTonTai(`Sefaria 404: ${path}`);
  if (!res.ok) throw new SefariaLoiHeThong(`Sefaria ${res.status}: ${path}`);

  const data = await res.json();
  // GIỮ NGUYÊN guard này — Sefaria trả HTTP 200 kèm {error} cho ref sai.
  if (data && typeof data === "object" && "error" in data) {
    throw new SefariaKhongTonTai(`Sefaria báo lỗi: ${(data as { error: string }).error}`);
  }
  return data as T;
}
```

Trong page:
```ts
try {
  data = await getText(ref);
} catch (e) {
  if (e instanceof SefariaKhongTonTai) notFound();
  throw e;   // → error.tsx, và Next trả 500; xem 6.4 để trả 503
}
```

## 6.4 Trả 503 đúng semantics cho lỗi upstream

Vì App Router không cho set status tuỳ ý từ page, dùng **route segment config + error boundary**, hoặc đơn giản nhất: thêm `src/app/doc/[book]/[chapter]/error.tsx` với thông điệp rõ ràng, **và** thêm một API `/api/status/sefaria` để monitoring biết. Nếu cần 503 thật, chuyển sang `middleware.ts` kiểm tra health cache — nhưng **chỉ làm nếu còn thời gian** (P2).

Điều **bắt buộc** ở pha này: **không được `notFound()` khi Sefaria sập** — vì Google sẽ deindex sách có thật.

## 6.5 Retry + backoff

```ts
async function fetchCoRetry(url: string, init: RequestInit, lan = 2): Promise<Response> {
  let loiCuoi: unknown;
  for (let i = 0; i <= lan; i++) {
    try {
      const r = await fetch(url, init);
      if (r.status >= 500) throw new Error(`upstream ${r.status}`);
      return r;
    } catch (e) {
      loiCuoi = e;
      if (i < lan) await new Promise((s) => setTimeout(s, 300 * 2 ** i));
    }
  }
  throw loiCuoi;
}
```

## ✅ CỔNG NGHIỆM THU PHA 3

```bash
for c in 1 2 2a 128 129 130 999 5000; do
  printf "/doc/Berakhot/%-6s " "$c"
  curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000/doc/Berakhot/$c"
done
```

- [ ] `/doc/Berakhot/999` → **404** (trước: 200)
- [ ] `/doc/Berakhot/5000` → **404**
- [ ] `/doc/Berakhot/2a` → **200 có nội dung**
- [ ] `/doc/Genesis/51` → **404**
- [ ] `/doc/Genesis/1` → **200, 31 câu** (không hồi quy)
- [ ] Test mới: `segmentHopLe` + `normalizeRef` có test PASS

**Commit**: `fix(routing): validate chapter bounds and distinguish upstream failure from not-found`

---

# §7 — PHA 4: CACHING, ISR & CẮT OVER-FETCH

## 7.1 Điều tra vì sao `/doc/**` không được cache

```
mcp__gitnexus__route_map(repo="sifria")
mcp__gitnexus__query(repo="sifria", q="revalidate dynamic force-dynamic cookies headers searchParams")
```

Kiểm tra từng nghi phạm biến route thành dynamic:
- `headers()` / `cookies()` được gọi ở đâu trong cây render?
- `searchParams` có được truy cập trong `/doc` không?
- `export const dynamic` có bị set ở layout không?

```bash
grep -rn "force-dynamic\|cookies()\|headers()\|searchParams" src/app src/components
```

## 7.2 Thêm `generateStaticParams` cho ~200 chương phổ biến

```ts
// src/app/doc/[book]/[chapter]/page.tsx
export const revalidate = 43200;
export const dynamicParams = true;   // vẫn cho phép ISR on-demand cho chương khác

/** 200 chương được đọc nhiều nhất: toàn bộ Torah + Psalms + 5 Megillot */
export async function generateStaticParams() {
  const UU_TIEN: [string, number][] = [
    ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
    ["Psalms", 30], ["Song of Songs", 8], ["Ruth", 4], ["Lamentations", 5],
    ["Ecclesiastes", 12], ["Esther", 10], ["Pirkei Avot", 6],
  ];
  const out: { book: string; chapter: string }[] = [];
  for (const [book, n] of UU_TIEN) {
    for (let c = 1; c <= n; c++) out.push({ book: encodeURIComponent(book), chapter: String(c) });
  }
  return out;   // ~262 trang
}
```

Tương tự cho `/sach/[book]` với ~50 sách phổ biến nhất.

## 7.3 Phân trang phía server cho `/thu-vien/[category]`

**Vấn đề đo được**: `/thu-vien/Halakhah` truyền **2.169 object** xuống client để hiện 24 → HTML **556 KB thô**.

Chuyển filter/sort/paginate lên server qua `searchParams`:

```tsx
// src/app/thu-vien/[category]/page.tsx
type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; sort?: "az" | "default"; page?: string }>;
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  const { q = "", sort = "default", page = "1" } = await searchParams;

  const { category, list } = await loadCategory(slug);
  if (!category) notFound();

  const PAGE_SIZE = 24;
  const trang = Math.max(1, Number(page) || 1);

  let loc = list;
  if (q.trim()) {
    const nq = boDau(q);
    loc = list.filter((b) => boDau([b.title, b.heTitle, viBook(b.title)?.name].join(" ")).includes(nq));
  }
  if (sort === "az") {
    loc = [...loc].sort((a, b) =>
      (viBook(a.title)?.name ?? a.title).localeCompare(viBook(b.title)?.name ?? b.title, "vi"));
  }

  const tongTrang = Math.max(1, Math.ceil(loc.length / PAGE_SIZE));
  const hienThi = loc.slice((trang - 1) * PAGE_SIZE, trang * PAGE_SIZE);
  // → CHỈ 24 object được serialize xuống client
}
```

Form lọc là `<form method="get">` thuần (giữ đúng tinh thần progressive enhancement mà `SearchForm.tsx` đã có). **Xoá hoặc thu nhỏ `CategoryBrowser.tsx`** — dùng `gitnexus.impact` trước khi xoá:

```
mcp__gitnexus__impact(repo="sifria", symbol="CategoryBrowser")
mcp__serena__find_referencing_symbols(name_path="CategoryBrowser", relative_path="src/components/library/CategoryBrowser.tsx")
```

**Lợi ích kép**: kết quả lọc giờ **share được bằng URL** và **SEO được**.

## ✅ CỔNG NGHIỆM THU PHA 4

```bash
./scripts/measure.sh http://localhost:3000
```

- [ ] `/doc/Genesis/1` có `x-nextjs-prerender: 1` (build local: kiểm `.next/server/app/doc/**` có file `.html`)
- [ ] HTML `/thu-vien/Halakhah`: **556 KB → < 40 KB thô**
- [ ] p95 TTFB `/doc/Genesis/1` giảm ≥ 50 % so với baseline
- [ ] `/thu-vien/Halakhah?q=shulchan&sort=az&page=2` hoạt động **khi tắt JavaScript**

**Commit**: `perf: prerender 262 popular chapters and move category filtering server-side`

---

# §8 — PHA 5: SEO

## 8.1 Sitemap index (thay 1 file 1,5 MB)

**Đo được**: `sitemap.xml` = 6.615 URL, 1,51 MB, sinh ~1,5 s mỗi request, **0 URL `/doc`** → nội dung thật vô hình với Google, còn ~48 % URL `/sach` thì dẫn tới sách hỏng.

```ts
// src/app/sitemap.ts — trở thành sitemap INDEX
import { SITE_URL } from "@/lib/site";

const PER_FILE = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tong = await demSoUrlDaXacThuc();     // đọc từ DB sau PHA 7, tạm thời từ index
  const soFile = Math.ceil(tong / PER_FILE);
  return Array.from({ length: soFile }, (_, i) => ({
    url: `${SITE_URL}/sitemap/${i}.xml`,
    lastModified: new Date(),
  }));
}
```

```ts
// src/app/sitemap/[id]/route.ts — từng phần, cache 24h
export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const urls = await layUrlTheoTrang(Number(id), 5000);   // CHỈ sách đã verify đọc được
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=86400" },
  });
}
```

**Quy tắc nội dung sitemap:**
1. Chỉ liệt kê sách có `is_readable = true` (điền bởi script audit ở PHA 7)
2. **Phải** bao gồm các chương phổ biến (`/doc/**`) — hiện đang 0
3. Loại `/tim-kiem` (đã `noindex`)

## 8.2 og:image động

**Đo được**: `grep og:image` = 0, nhưng vẫn khai `twitter:card = summary_large_image` → share ra Facebook/Zalo/LinkedIn là **thẻ trắng**.

```tsx
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "80px 96px", background: "#0b1220",
        backgroundImage: "radial-gradient(ellipse at 20% 10%, rgba(212,175,55,.25), transparent 60%)",
        color: "#f4ead2", fontFamily: "serif",
      }}>
        <span style={{ fontSize: 26, letterSpacing: 6, color: "#d4af37" }}>סִפְרִיָּה · SIFRIA</span>
        <span style={{ fontSize: 68, fontWeight: 700, marginTop: 24 }}>Ánh Sáng Cổ Thư</span>
        <span style={{ fontSize: 30, color: "#f4ead2aa", marginTop: 16 }}>
          Torah · Talmud · Kabbalah — song ngữ Hebrew–Anh
        </span>
      </div>
    ), size);
}
```

Và `src/app/doc/[book]/[chapter]/opengraph-image.tsx` với tên sách tiếng Việt + Hebrew + số chương.

## 8.3 BreadcrumbList JSON-LD

Breadcrumb HTML đã có ở `/doc` và `/sach` — thiếu structured data. Thêm vào cùng chỗ đã có `Chapter`/`Book` JSON-LD.

## 8.4 Robots cho trang lọc

```ts
// trong generateMetadata của /thu-vien/[category]
robots: (q || sort !== "default" || Number(page) > 1)
  ? { index: false, follow: true }
  : { index: true, follow: true },
```

## ✅ CỔNG NGHIỆM THU PHA 5

- [ ] `/sitemap.xml` < 50 KB, là index trỏ tới `/sitemap/0.xml`…
- [ ] Tổng URL trong các sitemap con **chỉ gồm sách đọc được** + có ≥ 200 URL `/doc`
- [ ] `curl -s $BASE/ | grep -c og:image` ≥ 1
- [ ] `/opengraph-image` trả `image/png`, status 200
- [ ] Facebook Sharing Debugger / opengraph.xyz hiển thị đúng thẻ

**Commit**: `feat(seo): split sitemap into index, add dynamic OG images and breadcrumb JSON-LD`

---

# §9 — PHA 6: ACCESSIBILITY

## 9.1 `lang="he"` / `lang="en"` — 2 dòng, tác động lớn nhất

**Vấn đề**: trang khai `<html lang="vi">`, câu Hebrew chỉ có `dir="rtl"` mà **không có `lang`** → screen reader đọc chữ Hebrew **bằng giọng tiếng Việt**.

```
mcp__serena__find_symbol(name_path="ReaderView", relative_path="src/components/reader/ReaderView.tsx", include_body=true)
```

```diff
- <p className="verse-he" dir="rtl">{v.he}</p>
+ <p className="verse-he" dir="rtl" lang="he">{v.he}</p>
- {v.en && prefs.mode !== "he" && <p className="verse-en">{v.en}</p>}
+ {v.en && prefs.mode !== "he" && <p className="verse-en" lang="en">{v.en}</p>}
```

Áp dụng cho **mọi** chỗ hiển thị Hebrew: `sach/[book]/page.tsx` (heTitle, số Hebrew), `thu-vien`, `tim-kiem`, `ContinueReading`, `HeroOrbit`.

```
mcp__gitnexus__cypher(repo="sifria", query="MATCH (n) WHERE n.text CONTAINS 'dir=\"rtl\"' RETURN n.file, n.line")
```
hoặc đơn giản: `grep -rn 'dir="rtl"' src/` rồi sửa từng chỗ.

## 9.2 Tương phản

Số đã tính theo WCAG 2.1 trên nền `#0b1220`:

| Class | Tỉ lệ | Trạng thái | Hành động |
|---|---|---|---|
| `text-parchment/40` | **3,36:1** | ❌ FAIL | → `/60` (6,17:1) |
| `text-parchment/50` | 4,62:1 | ⚠️ sát nút | → `/60` |
| `text-parchment/60` | 6,17:1 | ✅ | giữ |
| Nút copy-link `#a37d1a` @50% trên giấy `#f4ead2` | **< 2:1** | ❌❌ | → `#6b4f0a`, opacity 100% |

```bash
grep -rn "text-parchment/40\|text-parchment/50" src/   # 12 chỗ
```

## 9.3 Nút copy-link

```diff
- className="text-[10px] ... text-[#a37d1a]/50 opacity-0 ... group-hover:opacity-100"
+ className="text-[11px] ... text-[#6b4f0a] opacity-60 transition hover:opacity-100
+            focus-visible:opacity-100 group-hover:opacity-100
+            min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
```

Và sửa `catch {}` rỗng:
```ts
} catch {
  // Clipboard API không dùng được (context không bảo mật) — fallback + báo cho người dùng
  try {
    const ta = document.createElement("textarea");
    ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopiedVerse(n);
  } catch {
    setThongBao("Trình duyệt không cho sao chép. Bạn hãy sao chép thủ công từ thanh địa chỉ.");
  }
}
```

## 9.4 Các mục còn lại

```diff
# HebrewMarquee.tsx — SR đang đọc 44 ký tự Hebrew rời rạc
- <div className="pointer-events-none relative overflow-hidden py-6">
+ <div aria-hidden="true" className="pointer-events-none relative overflow-hidden py-6">
```

```diff
# HeroOrbit.tsx — trang trí thuần tuý
- <div className="relative mx-auto aspect-square w-full max-w-[520px]">
+ <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[520px]">
```

```diff
# ReaderView.tsx — danh sách câu
- <ol className="space-y-1" style={{ fontSize: `${prefs.fontScale}em` }}>
+ <ol className="space-y-1" style={{ fontSize: `${prefs.fontScale}em` }}
+     aria-label={`Danh sách câu — ${label}, ${donVi} ${chapter}`}>
```

```diff
# Trang đọc: h1 → h4 nhảy cóc
- <p className="mt-2 text-xs uppercase ...">{verses.length} câu · Song ngữ...</p>
+ <h2 className="mt-2 text-xs uppercase ...">{verses.length} câu · Song ngữ...</h2>
```

Thêm `aria-live` cho thông báo copy:
```tsx
<p role="status" aria-live="polite" className="sr-only">
  {copiedVerse ? `Đã sao chép liên kết câu ${copiedVerse}` : ""}
</p>
```

Thêm `prefers-contrast: more` vào `globals.css` (bên cạnh `prefers-reduced-motion` đã có):
```css
@media (prefers-contrast: more) {
  .glass { background: #0b1220; border-color: #d4af37; }
  .text-parchment\/60, .text-parchment\/70 { color: var(--parchment) !important; }
}
```

## 9.5 Tài liệu a11y — bằng chứng phỏng vấn

**`docs/a11y.md`**: ghi lại checklist đã test bằng bàn phím + NVDA, kèm số đo tương phản trước/sau. Đây là tài liệu senior sẽ hỏi tới.

## ✅ CỔNG NGHIỆM THU PHA 6

```bash
grep -rn 'dir="rtl"' src/ | grep -v 'lang="he"' | wc -l    # phải = 0
grep -rn 'text-parchment/40' src/ | wc -l                   # phải = 0
npx @lhci/cli autorun --collect.url=http://localhost:3000/doc/Genesis/1
```

- [ ] Lighthouse Accessibility ≥ **95**
- [ ] Tab qua toàn trang đọc: mọi control đều có focus ring nhìn thấy
- [ ] `docs/a11y.md` tồn tại với kết quả test thật

**Commit**: `a11y: add lang attributes to bilingual text, fix contrast, hide decorative elements from AT`

---

# §10 — PHA 7: CẮM POSTGRESQL VÀO LUỒNG THẬT

> Hiện tại: **7 bảng đã sync 6.598 sách lên Neon**, và file **duy nhất** import `@/db` là `/api/health` chạy `select 1`.

## 10.1 Mở rộng schema

```
mcp__serena__find_symbol(name_path="books", relative_path="src/db/schema.ts", include_body=true)
```

```ts
export const books = pgTable("books", {
  // … các cột hiện có …
  /** Kiểu địa chỉ do schema-resolver nhận diện */
  addressType: text("address_type", { enum: ["integer", "talmud", "complex", "unknown"] }),
  /** Ref hợp lệ đầu tiên — nút "Đọc từ đầu" dùng cái này */
  firstValidRef: text("first_valid_ref"),
  /** Đã verify đọc được chưa — điền bởi scripts/audit-coverage.ts */
  isReadable: boolean("is_readable").notNull().default(false),
  /** Số đơn vị (chương/daf/phần) */
  sectionCount: integer("section_count"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});
```

## 10.2 Cắm `/thu-vien`, `/thu-vien/[category]`, `/tim-kiem` vào DB

**Lợi ích đo được**: bỏ hẳn fetch `/index` **3,99 MB** mỗi cold request (vượt trần 2 MB của Next Data Cache nên **không bao giờ được cache**).

```ts
// src/lib/library-db.ts — MỚI, thay dần library.ts cho đường đọc
import { db } from "@/db";
import { books, categories } from "@/db/schema";
import { and, eq, ilike, or, sql, asc, desc } from "drizzle-orm";

export async function layDanhMuc() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function laySachTheoDanhMuc(opts: {
  categoryKey: string; q?: string; sort?: "az" | "default"; page: number; pageSize: number;
}) {
  const dieuKien = [eq(books.categoryKey, opts.categoryKey), eq(books.isReadable, true)];
  if (opts.q?.trim()) {
    const p = `%${opts.q.trim()}%`;
    dieuKien.push(or(ilike(books.title, p), ilike(books.nameVi, p), ilike(books.heTitle, p))!);
  }
  const where = and(...dieuKien);
  const [{ tong }] = await db.select({ tong: sql<number>`count(*)::int` }).from(books).where(where);
  const rows = await db.select().from(books).where(where)
    .orderBy(opts.sort === "az" ? asc(sql`coalesce(${books.nameVi}, ${books.title})`) : asc(books.id))
    .limit(opts.pageSize).offset((opts.page - 1) * opts.pageSize);
  return { rows, tong };
}
```

**Fallback bắt buộc**: nếu DB lỗi → rơi về `getIndex()` như cũ + banner "đang dùng dữ liệu trực tiếp". Không được để DB sập kéo sập cả site.

## 10.3 Mở rộng script sync

`scripts/sync-sefaria-index.ts` bổ sung: gọi `getBookIndex` + `giaiCauTruc` cho từng sách, điền `addressType` / `firstValidRef` / `sectionCount`, và **giới hạn 4 req/s** để tôn trọng Sefaria.

## 10.4 Cron re-sync

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/sync", "schedule": "0 3 * * 1" }] }
```

Route `/api/cron/sync` kiểm `Authorization: Bearer ${CRON_SECRET}` trước khi chạy.

## ✅ CỔNG NGHIỆM THU PHA 7

- [ ] `grep -rn "getIndex()" src/app | wc -l` giảm mạnh (chỉ còn ở fallback)
- [ ] p95 TTFB `/thu-vien` giảm ≥ 50 %
- [ ] Ngắt DB (đổi `DATABASE_URL` sai) → site **vẫn chạy** qua fallback, có banner
- [ ] `/api/health` trả `{ok, lastSync, booksCount, readableCount}`

**Commit**: `feat(db): serve library browsing and search from Postgres with live-API fallback`

---

# §11 — PHA 8: ĐÓNG GÓI

## 11.1 E2E Playwright

```bash
npm i -D @playwright/test && npx playwright install chromium
```

**`tests/e2e/reader.spec.ts`**:
```ts
import { test, expect } from "@playwright/test";

test("trang chủ → đọc Sáng Thế 1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Đọc Sáng Thế Ký/ }).click();
  await expect(page).toHaveURL(/\/doc\/Genesis\/1/);
  await expect(page.locator("li.verse")).toHaveCount(31);
  await expect(page.locator('[lang="he"]').first()).toBeVisible();
});

test("Talmud dùng daf, không dùng chương", async ({ page }) => {
  await page.goto("/sach/Berakhot");
  const first = page.locator('a[href^="/doc/Berakhot/"]').first();
  await expect(first).toHaveAttribute("href", "/doc/Berakhot/2a");
  await first.click();
  await expect(page.locator("li.verse").first()).toBeVisible();
});

test("URL chương ngoài biên trả 404", async ({ page }) => {
  const r = await page.goto("/doc/Berakhot/999");
  expect(r?.status()).toBe(404);
});

test("tìm kiếm tiếng Việt ra kết quả", async ({ page }) => {
  await page.goto("/tim-kiem?q=Thi+Thi%C3%AAn");
  await expect(page.getByRole("link", { name: /Thi Thiên/ })).toBeVisible();
});

test("lọc danh mục hoạt động khi TẮT JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto("/thu-vien/Tanakh?q=genesis");
  await expect(p.getByText(/Genesis|Sáng Thế/)).toBeVisible();
});
```

## 11.2 Lighthouse CI

**`.lighthouserc.json`**:
```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/thu-vien",
        "http://localhost:3000/doc/Genesis/1"
      ],
      "startServerCommand": "npm run start"
    },
    "assert": {
      "assertions": {
        "categories:performance":   ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo":           ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

## 11.3 ADR

- `docs/adr/0001-schema-resolver.md` — tại sao 3 kiểu địa chỉ, đánh đổi, lựa chọn thay thế đã cân nhắc
- `docs/adr/0002-postgres-mirror.md` — tại sao mirror index thay vì fetch trực tiếp (payload 3,99 MB > trần cache 2 MB)
- `docs/adr/0003-server-side-pagination.md` — tại sao bỏ client-side filter

## 11.4 README

Thêm: badge CI · 3 ảnh chụp màn hình · sơ đồ Mermaid · bảng **"Số liệu đo được"** trước/sau · mục License.

```mermaid
flowchart LR
  U[Người đọc] --> N[Next.js App Router]
  N -->|ISR 12h| P[(Postgres/Neon<br/>books · categories)]
  N -->|fetch có retry| S[Sefaria PUG API]
  P -.->|cron thứ 2 hàng tuần| S
  N --> R[ReaderView<br/>localStorage prefs]
```

## 11.5 Đổi tên repo

GitHub Settings → Rename → `sifria-bilingual-reader`. Cập nhật mọi link trong README/CV.

## ✅ CỔNG NGHIỆM THU PHA 8

- [ ] `npx playwright test` — 5/5 PASS
- [ ] Lighthouse CI PASS cả 3 URL
- [ ] 3 ADR tồn tại
- [ ] README có badge + ảnh + sơ đồ + bảng số liệu
- [ ] Repo đã đổi tên

**Commit**: `docs: add E2E suite, Lighthouse CI budget, ADRs and measured-metrics README`

---

# §12 — BẢNG NGHIỆM THU TỔNG (DEFINITION OF DONE)

| # | Tiêu chí | Lệnh kiểm chứng | Ngưỡng |
|---|---|---|---|
| 1 | Độ phủ đọc được | `npm run audit:coverage -- $BASE 200` | **≥ 95 %** |
| 2 | Chặn URL vô hạn | `curl -o /dev/null -w '%{http_code}' $BASE/doc/Berakhot/999` | **404** |
| 3 | Talmud dùng daf | `curl -s $BASE/sach/Berakhot \| grep -o 'doc/Berakhot/2a'` | có |
| 4 | Zohar đọc được | audit report | `ok: true` |
| 5 | Cache trang đọc | `curl -I $BASE/doc/Genesis/1 \| grep x-nextjs-prerender` | có |
| 6 | HTML danh mục | `curl -o /dev/null -w '%{size_download}' $BASE/thu-vien/Halakhah` | **< 40 KB** |
| 7 | Sitemap | `curl -s $BASE/sitemap.xml \| wc -c` | **< 50 KB**, là index |
| 8 | og:image | `curl -s $BASE/ \| grep -c og:image` | **≥ 1** |
| 9 | lang trên Hebrew | `grep -rn 'dir="rtl"' src \| grep -v 'lang="he"' \| wc -l` | **0** |
| 10 | Tương phản | `grep -rn 'text-parchment/40' src \| wc -l` | **0** |
| 11 | Test | `npm run test` | **≥ 30 PASS** |
| 12 | E2E | `npx playwright test` | **5/5 PASS** |
| 13 | CI | GitHub Actions | **xanh** |
| 14 | Bảo mật | `npm audit --audit-level=high` | **0 HIGH** |
| 15 | Lint/Type | `npm run lint && npm run typecheck` | **0 error** |
| 16 | Lighthouse | `npx @lhci/cli autorun` | Perf ≥ 90, A11y ≥ 95, SEO ≥ 95 |
| 17 | Repo sạch | `ls *.md` | chỉ `README.md` |
| 18 | Package name | `grep '"name"' package.json` | `"sifria"` |
| 19 | License | `ls LICENSE` | tồn tại |
| 20 | DB được dùng thật | `grep -rln "@/db" src/app \| wc -l` | **≥ 3** |
| 21 | ❌ Không có AI | `grep -rniE "openai\|anthropic\|embedding\|langchain\|@xenova" package.json src` | **0 kết quả** |

---

# §13 — CHIẾN LƯỢC COMMIT/PR & ROLLBACK

## 13.1 Một PR mỗi pha

```
fix/sifria-p0-hardening   ← branch tích hợp
  ├── PR #1  chore: repo hygiene + CI + Vitest          (PHA 0-1)
  ├── PR #2  fix: schema resolver                        (PHA 2)
  ├── PR #3  fix: bounds validation + error semantics    (PHA 3)
  ├── PR #4  perf: ISR + server-side pagination          (PHA 4)
  ├── PR #5  feat: sitemap index + OG images             (PHA 5)
  ├── PR #6  a11y: lang, contrast, ARIA                  (PHA 6)
  ├── PR #7  feat: Postgres cutover with fallback        (PHA 7)
  └── PR #8  docs: E2E, Lighthouse CI, ADRs, README      (PHA 8)
```

**Mỗi PR ≤ 400 dòng thay đổi.** Nếu vượt → tách nhỏ hơn.

## 13.2 Mẫu commit message

```
<type>(<scope>): <mô tả ngắn, thể mệnh lệnh>

VẤN ĐỀ
  <triệu chứng quan sát được + bằng chứng đo được>

NGUYÊN NHÂN GỐC
  <tại sao xảy ra, không phải "cái gì" xảy ra>

CÁCH SỬA
  <thay đổi gì, và tại sao chọn cách này>

ĐÃ KIỂM CHỨNG
  <lệnh cụ thể + kết quả trước/sau>
```

Ví dụ thật:
```
fix(reader): resolve Sefaria's three address schemas

VẤN ĐỀ
  Mẫu ngẫu nhiên 40/6598 đầu sách cho thấy 48% không đọc được qua đường đi chính
  (/sach/{book} → "Đọc từ đầu" → /doc/{book}/1). /doc/Zohar/1 trả 404;
  /doc/Berakhot/1 trả 200 nhưng 0 câu.

NGUYÊN NHÂN GỐC
  sach/[book]/page.tsx giả định mọi sách là mảng chương tuyến tính
  (Array.from({length: lengths[0]})). Sefaria thực tế có 3 kiểu địa chỉ:
  Integer, Talmud (daf 2a/2b — KHÔNG có daf 1), và complex (schema.nodes dạng cây).

CÁCH SỬA
  Thêm src/lib/schema-resolver.ts đọc schema.addressTypes/schema.nodes và sinh
  ref đúng cú pháp cho từng kiểu. Nút "Đọc từ đầu" dùng refDauTien thay vì "1" cứng.

ĐÃ KIỂM CHỨNG
  npm run audit:coverage -- <base> 200 → 52% → 96%
  /sach/Berakhot link đầu = /doc/Berakhot/2a (trước: /doc/Berakhot/1, 0 câu)
  18 test mới trong tests/unit/schema-resolver.test.ts PASS
```

## 13.3 Rollback

```bash
git tag pre-pha-<N>            # trước mỗi pha
git revert -m 1 <merge-sha>    # nếu PR đã merge
```

**Điều kiện rollback bắt buộc**: nếu sau một pha mà **coverage giảm** hoặc **CI đỏ** > 30 phút không sửa được → revert, phân tích lại bằng `gitnexus.detect_changes`.

## 13.4 Cập nhật memory sau mỗi pha

```
mcp__serena__write_memory(memory_name="04-tien-do", content="<đánh dấu [x] pha vừa xong + số đo thật>")
mcp__serena__think_about_whether_you_are_done()
mcp__serena__summarize_changes()
```

---

# §14 — PHỤ LỤC: LỆNH KIỂM CHỨNG TÁI LẬP

```bash
BASE=https://israeli-inspired-3d-book-website.vercel.app

# A. Bẫy URL vô hạn
for c in 128 129 130 200 999 5000; do
  printf "/doc/Berakhot/%-6s " "$c"
  curl -s -o /tmp/b.html -w '%{http_code} ' "$BASE/doc/Berakhot/$c"
  echo "verses=$(grep -o 'class=\"verse ' /tmp/b.html | wc -l)"
done

# B. Sách nổi bật trên trang chủ có đọc được không
for b in Genesis Isaiah Psalms "Pirkei Avot" Berakhot Zohar "Bereshit Rabbah" "Guide for the Perplexed"; do
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$b")
  s=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/sach/$enc")
  first=$(curl -s "$BASE/sach/$enc" | grep -oE 'href="/doc/[^"]*"' | sed -n 2p | sed 's/href="//;s/"//')
  d=$(curl -s -o /tmp/c.html -w '%{http_code}' "$BASE$first")
  printf "%-26s sach=%s first=%-30s doc=%s verses=%s\n" "$b" "$s" "$first" "$d" "$(grep -o 'class=\"verse ' /tmp/c.html | wc -l)"
done

# C. Cache
for u in / /thu-vien /sach/Genesis /doc/Genesis/1; do
  printf "%-22s " "$u"; curl -sI "$BASE$u" | grep -iE 'x-vercel-cache|x-nextjs-prerender' | tr -d '\r\n'; echo
done

# D. Payload
for u in /thu-vien/Halakhah /thu-vien/Talmud; do
  printf "%-22s nen=%s tho=%s\n" "$u" \
    "$(curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w '%{size_download}' "$BASE$u")" \
    "$(curl -s -o /dev/null -w '%{size_download}' "$BASE$u")"
done

# E. Sitemap
curl -s "$BASE/sitemap.xml" -o /tmp/sm.xml
echo "bytes=$(wc -c < /tmp/sm.xml) urls=$(grep -c '<loc>' /tmp/sm.xml) doc=$(grep -c 'doc/' /tmp/sm.xml)"

# F. A11y nhanh
curl -s "$BASE/doc/Genesis/1" | grep -c 'lang="he"'    # kỳ vọng > 0 sau PHA 6

# G. Bảo mật
npm audit --audit-level=high
```

---

## ⚠️ NHẮC CUỐI CHO AGENT

1. **Không tính năng AI.** Kiểm tra cuối cùng bằng tiêu chí #21 trong §12.
2. **Không bịa số.** Mọi con số vào `docs/metrics.md` phải do agent tự chạy lệnh mà ra.
3. **Giữ các điểm mạnh sẵn có**: guard `{error}` trong `sefariaFetch`, `SITE_URL` một nguồn sự thật, `useSyncExternalStore`, RSC-first, security headers.
4. **Không đụng** `next.config.ts` security headers trừ khi làm CSP nonce (P2).
5. Sau mỗi pha: `serena.think_about_task_adherence()` để tự kiểm còn bám mục tiêu không.
