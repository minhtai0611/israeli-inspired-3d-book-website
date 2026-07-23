# CLAUDE CODE EXECUTION PLAN — SIFRIA

**Project:** `minhtai0611/israeli-inspired-3d-book-website`  
**Live site reviewed:** `https://israeli-inspired-3d-book-website.vercel.app/`  
**Primary goal:** biến project từ một website đọc sách đẹp thành một **digital library sản phẩm hóa thật sự**, sửa các lỗi sự thật sản phẩm, SEO, accessibility, data architecture, và tận dụng đúng Next.js + Drizzle + PostgreSQL.  
**Bản này được viết để Claude Code thực thi end-to-end với hỗ trợ từ GitNexus MCP và Serena MCP.**

---

## 1) MISSION

Bạn đang sửa một website đọc thư viện Do Thái/Israel giao diện tiếng Việt.

### Kết quả cuối cùng bắt buộc phải đạt
1. **Không bịa nội dung**: chỉ dùng dữ liệu thật từ Sefaria cho text nguồn.
2. **Không nói quá**: mọi copy/metadata phải phản ánh đúng thực trạng sản phẩm.
3. **Không AI features**.
4. **Phải production-ready hơn hiện tại**: SEO đúng, discoverability tốt hơn, search thật, accessibility tốt hơn, data layer bền hơn.
5. **Mọi thay đổi phải có kiểm chứng**: build, lint, typecheck, manual route check.

---

## 2) NON-NEGOTIABLE CONSTRAINTS

1. **Không được biến text gốc thành “dịch tiếng Việt đầy đủ” nếu repo hiện chưa có dữ liệu dịch thật.**
2. **Không được fabricate scripture/text commentary.**
3. **Không được giữ các tuyên bố sai sự thật**, ví dụ:
   - nói có search khi chưa có search
   - nói là “tiếng Việt” theo nghĩa full text translation nếu thực ra chỉ là UI tiếng Việt + HE/EN text
4. **Không được phá visual identity cốt lõi**:
   - parchment reader
   - Hebrew visual layer
   - aesthetic tổng thể
5. **Không thêm MCP-specific code hoặc hard dependency vào app runtime.** MCP chỉ phục vụ quy trình sửa code.

---

## 3) HOW TO USE GITNEXUS MCP + SERENA MCP

## 3.1. GitNexus MCP — dùng cho repo intelligence và thay đổi an toàn
Dùng GitNexus MCP để:
- đọc commit history liên quan metadata / README / layout / SEO
- xem diff logic giữa các commit
- tạo plan theo PR-sized chunks
- nhóm thay đổi theo phase nhỏ, dễ review
- tìm nơi file nào liên quan domain, canonical, sitemap, structured data

### GitNexus task gợi ý
- tìm mọi file tham chiếu `sifria.app`
- tìm mọi route liên quan `/tim-kiem`
- tìm thay đổi gần nhất ở `README`, `layout.tsx`, `robots.ts`, `sitemap.ts`
- tạo change-set theo phase: `seo-fix`, `search-foundation`, `library-discovery`, `reader-controls`, `db-foundation`

## 3.2. Serena MCP — dùng cho symbol-aware refactor
Dùng Serena để:
- định vị symbol `getIndex`, `getText`, `getBookIndex`, `viBook`, `viCategory`
- refactor xuyên file an toàn
- rename/reshape data flow
- tìm component nào dùng navigation/card/filter/library/reader state
- tránh search-replace mù

### Serena task gợi ý
- map toàn bộ call graph từ `src/lib/sefaria.ts`
- locate all metadata exports
- locate all navigation/hero copy declarations
- trace route tree và dependency tree cho `/thu-vien`, `/sach/[book]`, `/doc/[book]/[chapter]`

---

## 4) BASELINE FINDINGS TO FIX

## 4.1. P0 — SEO canonical/domain mismatch
### Vấn đề
Site production đang chạy trên Vercel domain nhưng metadata/robots/sitemap/JSON-LD đang trỏ `https://sifria.app`.

### Cần sửa
- `src/app/layout.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- mọi JSON-LD URL
- mọi canonical URL

### Yêu cầu thực hiện
- tạo 1 source of truth cho site URL, ví dụ `src/lib/site.ts`
- `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? production fallback`
- dùng source đó cho:
  - `metadataBase`
  - `openGraph.url`
  - canonical
  - robots sitemap
  - sitemap URLs
  - JSON-LD

### Acceptance
- `curl` home page thấy canonical đúng domain thật
- `robots.txt` và `sitemap.xml` cùng domain
- không còn hardcoded `sifria.app` nếu custom domain chưa dùng thật

---

## 4.2. P0 — SearchAction giả
### Vấn đề
Structured data có `SearchAction` tới `/tim-kiem` nhưng route này không tồn tại.

### Cần quyết định
**Nếu chưa làm search trong cùng phase:** gỡ `SearchAction` ngay.  
**Nếu làm search trong phase này:** chỉ giữ `SearchAction` sau khi route hoạt động thật.

### Acceptance
- `/tim-kiem` có route thật, hoặc JSON-LD không còn khai báo search giả

---

## 4.3. P0 — Product truth về “tiếng Việt”
### Vấn đề
Copy/SEO hiện dễ khiến user hiểu là site có full-text Vietnamese translation, trong khi thực tế source text là Hebrew + English từ Sefaria.

### Cần sửa copy ở
- `src/app/page.tsx`
- `src/app/layout.tsx`
- có thể cả `README.md`
- các metadata title/description liên quan

### Hướng copy đúng hơn
- “giao diện tiếng Việt cho thư viện HE/EN từ Sefaria”
- “đọc Torah, Talmud, Kabbalah trong không gian tiếng Việt”
- “nội dung song ngữ Hebrew–English, lớp giới thiệu và điều hướng bằng tiếng Việt”

### Acceptance
- không còn tuyên bố mập mờ kiểu “Torah tiếng Việt” nếu không có bản dịch toàn văn thật

---

## 4.4. P1 — Library discoverability quá yếu
### Vấn đề
`/thu-vien` chỉ lộ 24 item mỗi category, trong khi dữ liệu thực tế rất lớn.

### Mục tiêu
Biến thư viện từ “showroom” thành “công cụ khám phá”.

### Cần làm
1. Tạo route category-level hoặc query-level:
   - `/thu-vien/[category]`
   - hoặc `/thu-vien?category=Tanakh&page=2`
2. Thêm:
   - phân trang
   - filter category
   - sort A-Z
   - search theo tên sách
3. Không chỉ hiện “… còn N tác phẩm khác” mà phải cho người dùng đi tiếp được.

### Files có thể tạo/sửa
- `src/app/thu-vien/page.tsx`
- tạo route category mới nếu cần
- component library browser riêng, ví dụ `src/components/library/*`

### Acceptance
- user có thể duyệt tất cả sách trong một category
- không còn dead-end sau 24 item đầu

---

## 4.5. P1 — Search thật sự
### Mục tiêu
Tạo route search production thật, không AI.

## Scope phase 1/2 đề xuất
### Search phase A — metadata search nội bộ
Dùng local index từ Sefaria index + localized labels để search:
- title EN
- heTitle
- category
- Vietnamese label/blurb nếu có

### Search phase B — text search qua Sefaria search API hoặc local strategy
Nếu làm text search ngay, cần làm rõ source và giới hạn.

## Tech design khuyến nghị
### Option an toàn và hợp stack nhất
- mirror metadata vào PostgreSQL
- search bằng Postgres full-text search
- chỉ text-level deep search thì cân nhắc Sefaria search endpoint

### PostgreSQL techniques nên tận dụng
- `tsvector`
- `setweight`
- `GIN` index
- `ts_rank`
- `ts_headline`

### Schema tối thiểu nên thêm
- `categories`
- `books`
- `book_aliases`
- `book_search_index`
- `sync_runs`

### Acceptance
- route `/tim-kiem?q=genesis` trả kết quả thật
- từ home/library có search box điều hướng đến search page
- JSON-LD SearchAction chỉ thêm lại sau khi route hoạt động thật

---

## 4.6. P1 — Mirror Sefaria index vào DB để bỏ phụ thuộc runtime 5.3MB index fetch
### Vấn đề
Build từng báo index quá lớn để set cache như kỳ vọng.

### Mục tiêu
Tạo sync layer bền hơn.

### Cần làm
1. tạo script sync từ Sefaria `/index`
2. chuẩn hóa category/book metadata vào DB
3. library/search dùng DB thay vì runtime fetch toàn bộ tree lớn cho mọi nơi cần browse
4. giữ text chapter fetch từ Sefaria làm source of truth

### Gợi ý file structure
- `src/db/schema.ts`
- `src/lib/sync-sefaria.ts`
- `scripts/sync-sefaria-index.ts`
- `src/lib/books.ts`

### Acceptance
- library page có thể chạy từ DB metadata
- có command sync rõ ràng
- có docs setup rõ ràng

---

## 4.7. P1 — Reader controls và user retention basics
### Cần làm
1. reader controls:
   - font size
   - line height
   - show both / Hebrew only / English only
2. verse anchors:
   - deep link `#v12`
   - copy verse link
3. history/progress:
   - recently read
   - continue reading

### Nếu có thời gian, thêm luôn
- bookmarks
- favorites

### Tận dụng DB
- `reading_history`
- `reading_progress`
- `bookmarks`

### Acceptance
- reader không còn chỉ là màn hình xem tĩnh
- user có khả năng quay lại đọc tiếp

---

## 4.8. P1 — Accessibility fixes
### Bắt buộc
1. `prefers-reduced-motion`
2. nút pause/hide cho marquee/ambient motion nếu cần
3. skip link vào main content
4. focus styles rõ ràng
5. keyboard usability qua nav/reader controls

### Files trọng điểm
- `src/app/globals.css`
- `src/app/layout.tsx`
- header/nav components
- hero/marquee components

### Acceptance
- có reduced motion support rõ ràng
- có skip link đầu trang
- motion không còn ép mọi user phải chịu

---

## 4.9. P1 — Security + dependency hygiene
### Cần làm
1. nâng `next` lên patch an toàn hơn trong nhánh hiện hành
2. thêm hardening headers nếu hợp với deploy
3. review `next.config.ts` để set headers

### Headers nên cân nhắc
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options` hoặc `frame-ancestors` trong CSP
- `Permissions-Policy`

### Acceptance
- `npm audit` giảm rủi ro quan trọng nhất
- live headers cứng hơn hiện tại

---

## 5) FILE-BY-FILE EXECUTION MAP

## Phase A — truth + SEO
- `src/app/layout.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- tạo `src/lib/site.ts`
- `README.md`
- `src/app/page.tsx`

## Phase B — search foundation + DB
- `src/db/schema.ts`
- `src/db/index.ts`
- `src/lib/sefaria.ts`
- tạo sync script
- tạo route `/tim-kiem`
- tạo query helpers cho DB

## Phase C — library browser
- `src/app/thu-vien/page.tsx`
- route category/search pages mới
- components browse/filter/pagination

## Phase D — reader + retention
- `src/app/doc/[book]/[chapter]/page.tsx`
- components reader controls
- DB tables progress/bookmarks/history

## Phase E — accessibility + hardening
- `src/app/globals.css`
- nav/header/footer/hero/marquee
- `next.config.ts`

---

## 6) RECOMMENDED IMPLEMENTATION ORDER

1. **Create branch / safety snapshot**
2. **Fix site URL single source of truth**
3. **Fix canonical/robots/sitemap/JSON-LD**
4. **Fix copy truth about Vietnamese scope**
5. **Remove fake SearchAction**
6. **Introduce DB schema + sync foundation**
7. **Implement search route**
8. **Refactor library browsing**
9. **Add reader controls + progress/history**
10. **Accessibility pass**
11. **Security/dependency pass**
12. **Docs + validation evidence**

---

## 7) VALIDATION CHECKLIST

## Build quality
- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Manual route checks
- `/`
- `/thu-vien`
- `/tim-kiem?q=Genesis`
- `/sach/Genesis`
- `/doc/Genesis/1`
- `robots.txt`
- `sitemap.xml`

## HTTP / metadata checks
- canonical đúng domain
- `robots.txt` đúng sitemap URL
- `sitemap.xml` đúng domain
- không còn `sifria.app` hardcode sai nếu chưa dùng custom domain thật
- không còn `SearchAction` giả

## Product truth checks
- copy không ám chỉ full-text Vietnamese translation nếu không có dữ liệu thật
- attributions với Sefaria còn nguyên hoặc rõ hơn

## Accessibility checks
- có skip link
- reduced motion hoạt động
- focus indicator rõ
- keyboard tab không bị kẹt

---

## 8) DEFINITION OF DONE

Chỉ được coi là xong khi:
1. Build + lint + typecheck đều pass.
2. Canonical/robots/sitemap/JSON-LD đúng hoàn toàn.
3. Search route hoạt động thật hoặc SearchAction bị gỡ thật.
4. Library không còn dead-end 24 item.
5. Có DB schema tối thiểu cho metadata/search foundation.
6. Reader có controls cơ bản + retention foundation.
7. Accessibility có reduced motion + skip link.
8. README cập nhật đúng kiến trúc mới.

---

## 9) FINAL DELIVERABLES CLAUDE CODE MUST PRODUCE

1. Code changes hoàn chỉnh.
2. `README.md` cập nhật.
3. Migration/schema/update docs nếu có DB changes.
4. Một file `CHANGELOG_SIFRIA_FIXES.md` tóm tắt:
   - đã sửa gì
   - vì sao sửa
   - route nào mới
   - validation nào đã chạy
5. Nếu có thể, thêm `scripts/` hoặc `docs/` cho sync/search architecture.

---

## 10) IMPORTANT STYLE NOTE FOR CLAUDE CODE

Khi sửa project này, ưu tiên:
- trung thực hơn là hoa mỹ
- đơn giản đúng hơn là phức tạp đẹp mắt
- search/discovery/retention hơn là thêm animation
- source-of-truth architecture hơn là patch UI tạm thời

**Mục tiêu cuối:** giữ linh hồn Sifria, nhưng nâng nó từ “website đẹp” thành “thư viện số có xương sống sản phẩm”.
