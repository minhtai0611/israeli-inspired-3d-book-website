/**
 * Measures the share of books that are actually readable through the primary
 * user path: /book/{title} -> click "Đọc từ đầu" -> /read/{title}/{firstSegment}.
 * The first-chapter segment is extracted from the "Đọc từ đầu" link's real
 * href rather than assumed to be "1" — Talmud books start at daf "2a" and
 * complex-schema books (e.g. Zohar) start at a named section, not a number.
 * Uses a fixed-seed PRNG (not Math.random) so the sample is reproducible.
 *
 * Usage: npx tsx scripts/audit-coverage.ts [baseUrl] [sampleSize]
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { getIndex } from "../src/lib/sefaria";
import { flattenBooks } from "../src/lib/library";

const BASE = process.argv[2] ?? "http://localhost:3000";
const N = Number(process.argv[3] ?? 200);
const SEED = 20260725;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A real browser HTML-decodes href attributes before navigating; this regex-based extractor must too. */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function regexEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a regex matching this book's own first /read href in its /book page.
 * `encodeURIComponent` leaves `. * ( ) ! ~ '` unescaped, so titles containing
 * them (parens are common in commentary titles, e.g. "Tosefta Sotah
 * (Lieberman)") need regex-escaping, and `'` also needs to match React's
 * rendered `&#x27;`/`&#39;` HTML-entity form, not just the literal character.
 */
function hrefPatternFor(encodedTitle: string): RegExp {
  const pattern = regexEscape(encodedTitle).replace(/'/g, "(?:&#x27;|&#39;|')");
  return new RegExp(`href="(/read/${pattern}/[^"]*)"`);
}

type Row = {
  title: string;
  category: string;
  bookStatus: number;
  firstHref: string | null;
  readStatus: number;
  verses: number;
  ok: boolean;
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
  const CHUNK = 4;
  for (let i = 0; i < sample.length; i += CHUNK) {
    const batch = sample.slice(i, i + CHUNK).map(async (b) => {
      const enc = encodeURIComponent(b.title);
      const s = await fetch(`${BASE}/book/${enc}`).catch(() => null);
      const bookHtml = s && s.ok ? await s.text() : "";
      const rawHref = hrefPatternFor(enc).exec(bookHtml)?.[1] ?? null;
      const firstHref = rawHref ? decodeHtmlEntities(rawHref) : null;

      const d = firstHref ? await fetch(`${BASE}${firstHref}`).catch(() => null) : null;
      const html = d && d.ok ? await d.text() : "";
      const verses = (html.match(/class="verse /g) ?? []).length;
      rows.push({
        title: b.title,
        category: b.categoryPath[0] ?? "?",
        bookStatus: s?.status ?? 0,
        firstHref,
        readStatus: d?.status ?? 0,
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
    e.total++;
    if (r.ok) e.ok++;
    byCat.set(r.category, e);
  }

  const md = [
    `# Content coverage report`,
    ``,
    `- Base: \`${BASE}\``,
    `- Sample: **${rows.length}** / ${books.length} titles (seed ${SEED}, reproducible)`,
    `- Readable: **${ok}/${rows.length} = ${pct}%**`,
    `- Run at: ${new Date().toISOString()}`,
    ``,
    `## By collection`,
    ``,
    `| Collection | Readable | Total | % |`,
    `|---|---|---|---|`,
    ...[...byCat.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([c, e]) => `| ${c} | ${e.ok} | ${e.total} | ${((e.ok / e.total) * 100).toFixed(0)}% |`),
    ``,
    `## Broken`,
    ``,
    `| Book | Collection | /book | First-chapter href | status | Verses |`,
    `|---|---|---|---|---|---|`,
    ...rows
      .filter((r) => !r.ok)
      .map((r) => `| ${r.title} | ${r.category} | ${r.bookStatus} | ${r.firstHref ?? "(none)"} | ${r.readStatus} | ${r.verses} |`),
  ].join("\n");

  writeFileSync("docs/coverage-report.md", md);
  console.log(`Readable ${ok}/${rows.length} = ${pct}%`);
}

main();
