/**
 * Finds complex-schema books (schema.nodes tree — Zohar, Guide for the
 * Perplexed, Shulchan Arukh, etc.) and walks every leaf's rendered page,
 * following the "Chương trước"/"Chương tiếp" (prev/next) links exactly as a
 * real user's click would, checking every hop resolves to HTTP 200.
 *
 * This specifically targets the bug class fixed in dbeaa7c (linkFromRef
 * garbling multi-word bare-node refs) — the earlier audit-coverage.ts only
 * checks the FIRST chapter via "Đọc từ đầu", never prev/next navigation.
 *
 * Usage: npx tsx scripts/audit-complex-nav.ts [baseUrl] [bookSampleSize]
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { getIndex, getBookIndex } from "../src/lib/sefaria";
import { flattenBooks } from "../src/lib/library";
import { resolveStructure } from "../src/lib/schema-resolver";

const BASE = process.argv[2] ?? "http://localhost:3000";
const N = Number(process.argv[3] ?? 400);
const SEED = 20260727;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type LeafResult = {
  book: string;
  segment: string;
  href: string;
  status: number;
  prevHref: string | null;
  prevStatus: number | null;
  nextHref: string | null;
  nextStatus: number | null;
};

async function fetchStatus(url: string): Promise<number> {
  try {
    const r = await fetch(url);
    return r.status;
  } catch {
    return -1;
  }
}

async function checkLeaf(book: string, segment: string): Promise<LeafResult> {
  const href = `/doc/${encodeURIComponent(book)}/${encodeURIComponent(segment)}`;
  let status = -1;
  let html = "";
  try {
    const r = await fetch(`${BASE}${href}`);
    status = r.status;
    html = r.ok ? await r.text() : "";
  } catch {
    /* status stays -1 */
  }

  const nextIdx = html.indexOf("Chương tiếp");
  let nextHref: string | null = null;
  if (nextIdx !== -1) {
    const before = html.lastIndexOf('href="/doc/', nextIdx);
    if (before !== -1) nextHref = /href="([^"]*)"/.exec(html.slice(before))?.[1] ?? null;
  }
  const prevIdx = html.indexOf("Chương trước");
  let prevHref: string | null = null;
  if (prevIdx !== -1) {
    const before = html.lastIndexOf('href="/doc/', prevIdx);
    if (before !== -1) prevHref = /href="([^"]*)"/.exec(html.slice(before))?.[1] ?? null;
  }

  const prevStatus = prevHref ? await fetchStatus(`${BASE}${prevHref}`) : null;
  const nextStatus = nextHref ? await fetchStatus(`${BASE}${nextHref}`) : null;

  return { book, segment, href, status, prevHref, prevStatus, nextHref, nextStatus };
}

async function main() {
  const books = flattenBooks(await getIndex());
  const rand = rng(SEED);
  const pool = [...books];
  const sample: typeof books = [];
  for (let i = 0; i < Math.min(N, pool.length); i++) {
    sample.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }

  console.log(`Classifying ${sample.length} sampled books...`);
  const complexBooks: string[] = [];
  const CHUNK = 8;
  for (let i = 0; i < sample.length; i += CHUNK) {
    const batch = sample.slice(i, i + CHUNK);
    await Promise.all(
      batch.map(async (b) => {
        try {
          const idx = await getBookIndex(b.title);
          if (idx.schema?.nodes && idx.schema.nodes.length > 0) {
            complexBooks.push(b.title);
          }
        } catch {
          /* skip books that fail to resolve their index at all */
        }
      }),
    );
    process.stdout.write(`\r  ${Math.min(i + CHUNK, sample.length)}/${sample.length} checked, ${complexBooks.length} complex so far`);
  }
  console.log(`\nFound ${complexBooks.length} complex-schema books in sample:`, complexBooks);

  const results: LeafResult[] = [];
  for (const title of complexBooks) {
    const idx = await getBookIndex(title).catch(() => null);
    if (!idx) continue;
    const structure = resolveStructure(idx, title);
    console.log(`\n${title}: ${structure.items.length} leaves`);
    for (let i = 0; i < structure.items.length; i += CHUNK) {
      const batch = structure.items.slice(i, i + CHUNK);
      const batchResults = await Promise.all(batch.map((item) => checkLeaf(title, item.segment)));
      results.push(...batchResults);
    }
  }

  const broken = results.filter(
    (r) => r.status !== 200 || (r.prevHref && r.prevStatus !== 200) || (r.nextHref && r.nextStatus !== 200),
  );

  const md = [
    `# Complex-schema navigation audit`,
    ``,
    `- Base: \`${BASE}\``,
    `- Book sample: ${sample.length} / ${books.length}, complex found: ${complexBooks.length}`,
    `- Leaves checked: ${results.length}`,
    `- Broken: ${broken.length}`,
    ``,
    `## Broken leaves`,
    ``,
    `| Book | Segment | Own status | Prev href | Prev status | Next href | Next status |`,
    `|---|---|---|---|---|---|---|`,
    ...broken.map(
      (r) =>
        `| ${r.book} | ${r.segment} | ${r.status} | ${r.prevHref ?? "-"} | ${r.prevStatus ?? "-"} | ${r.nextHref ?? "-"} | ${r.nextStatus ?? "-"} |`,
    ),
  ].join("\n");

  writeFileSync("docs/complex-nav-audit-report.md", md);
  console.log(`\n\nDone. ${broken.length}/${results.length} leaves have a broken own/prev/next status.`);
  console.log(`Report written to docs/complex-nav-audit-report.md`);
}

main();
