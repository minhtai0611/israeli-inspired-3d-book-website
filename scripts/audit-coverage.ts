/**
 * Measures the share of books that are actually readable through the primary
 * user path: /sach/{title} -> "read from start" -> /doc/{title}/1.
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

type Row = {
  title: string;
  category: string;
  sachStatus: number;
  docStatus: number;
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
    `| Book | Collection | /sach | /doc/1 | Verses |`,
    `|---|---|---|---|---|`,
    ...rows
      .filter((r) => !r.ok)
      .map((r) => `| ${r.title} | ${r.category} | ${r.sachStatus} | ${r.docStatus} | ${r.verses} |`),
  ].join("\n");

  writeFileSync("docs/coverage-report.md", md);
  console.log(`Readable ${ok}/${rows.length} = ${pct}%`);
}

main();
