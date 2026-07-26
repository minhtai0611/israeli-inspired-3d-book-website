// Shared sync logic used by both scripts/sync-sefaria-index.ts (CLI, unbounded
// time) and src/app/api/cron/sync/route.ts (Vercel Function, hard execution
// limit — 300s on Hobby, up to 800s/1800s-with-extended-config on Pro/
// Enterprise; verified against Vercel's docs 2026-07-26). A full catalog
// verification (runFullCatalogSync) makes 1-20+ live Sefaria calls PER BOOK
// across 6,598 books — tens of minutes — which does not fit in any tier's
// function duration. runMetadataOnlySync is the one safe to run on a cron: it
// only re-fetches the index tree and upserts title/category/name fields, with
// NO per-book verification calls, so it finishes in seconds regardless of
// catalog size. It deliberately does NOT touch addressType/firstValidRef/
// isReadable/sectionCount/verifiedAt on conflict — those stay whatever the
// last full sync computed; a lightweight run must never wipe verified data.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { books, bookAliases, categories, syncRuns } from "@/db/schema";
import { getBookIndex, getIndex, getText } from "@/lib/sefaria";
import { CATEGORY_ORDER, flattenBooks, groupByCategory, type FlatBook } from "@/lib/library";
import { viBook, viCategory } from "@/lib/vi";
import {
  resolveStructure,
  buildIntegerItems,
  findFirstReadableRef,
  type AddressKind,
} from "@/lib/schema-resolver";

// Gentle on Sefaria — matches the concurrency scripts/audit-coverage.ts already
// uses without issue. A stricter per-book budget (findFirstReadableRef can hop
// through several empty sections) matters more here than raw concurrency.
const CONCURRENCY = 5;

type Verification = {
  addressType: AddressKind;
  firstValidRef: string | null;
  isReadable: boolean;
  sectionCount: number | null;
};

async function verifyReadability(title: string): Promise<Verification> {
  try {
    const index = await getBookIndex(title);
    let structure = resolveStructure(index, title);

    // Same rescue BookPage uses: if neither schema.lengths nor schema.nodes
    // gave us a structure, try the bare title as a last resort.
    if (structure.kind === "unknown") {
      try {
        const first = await getText(title);
        const len = first.lengths?.[0] ?? first.length ?? 0;
        if (len > 0) {
          structure = buildIntegerItems(title, len, first.sectionNames?.[0] ?? "Chương");
        }
      } catch {
        // leave as unknown
      }
    }

    const readable = await findFirstReadableRef(structure, getText);
    return {
      addressType: structure.kind,
      firstValidRef: readable?.ref ?? structure.firstRef ?? null,
      isReadable: readable !== null,
      sectionCount: structure.items.length || null,
    };
  } catch {
    return { addressType: "unknown", firstValidRef: null, isReadable: false, sectionCount: null };
  }
}

async function upsertCategories(grouped: Map<string, FlatBook[]>): Promise<void> {
  for (const key of grouped.keys()) {
    const meta = viCategory(key);
    const order = CATEGORY_ORDER.indexOf(key);
    await db
      .insert(categories)
      .values({
        key,
        nameEn: key,
        nameVi: meta.name,
        descVi: meta.desc,
        icon: meta.icon,
        sortOrder: order === -1 ? CATEGORY_ORDER.length : order,
      })
      .onConflictDoUpdate({
        target: categories.key,
        set: { nameVi: meta.name, descVi: meta.desc, icon: meta.icon },
      });
  }
}

async function upsertBookAlias(bookId: number, alias: string | undefined): Promise<void> {
  if (!alias) return;
  await db.insert(bookAliases).values({ bookId, alias }).onConflictDoNothing();
}

/** Metadata only — no Sefaria calls beyond the one getIndex(). Safe for a cron function's duration limit. */
async function upsertBookMetadata(b: FlatBook): Promise<void> {
  const categoryKey = b.categoryPath[0] ?? "Reference";
  const vi = viBook(b.title);
  const [row] = await db
    .insert(books)
    .values({ title: b.title, heTitle: b.heTitle, categoryKey, enShortDesc: b.shortDesc, nameVi: vi?.name, blurbVi: vi?.blurb })
    .onConflictDoUpdate({
      target: books.title,
      set: {
        heTitle: b.heTitle,
        categoryKey,
        enShortDesc: b.shortDesc,
        nameVi: vi?.name,
        blurbVi: vi?.blurb,
        updatedAt: new Date(),
      },
    })
    .returning({ id: books.id });
  await upsertBookAlias(row.id, vi?.name);
}

/** Metadata + a live Sefaria readability check per book. Slow — unbounded CLI use only. */
async function upsertBookWithVerification(b: FlatBook): Promise<boolean> {
  const categoryKey = b.categoryPath[0] ?? "Reference";
  const vi = viBook(b.title);
  const verification = await verifyReadability(b.title);

  const [row] = await db
    .insert(books)
    .values({
      title: b.title,
      heTitle: b.heTitle,
      categoryKey,
      enShortDesc: b.shortDesc,
      nameVi: vi?.name,
      blurbVi: vi?.blurb,
      addressType: verification.addressType,
      firstValidRef: verification.firstValidRef,
      isReadable: verification.isReadable,
      sectionCount: verification.sectionCount,
      verifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: books.title,
      set: {
        heTitle: b.heTitle,
        categoryKey,
        enShortDesc: b.shortDesc,
        nameVi: vi?.name,
        blurbVi: vi?.blurb,
        addressType: verification.addressType,
        firstValidRef: verification.firstValidRef,
        isReadable: verification.isReadable,
        sectionCount: verification.sectionCount,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: books.id });

  await upsertBookAlias(row.id, vi?.name);
  return verification.isReadable;
}

async function withSyncRun<T extends { synced: number }>(run: () => Promise<T>): Promise<T> {
  const [syncRun] = await db.insert(syncRuns).values({ status: "running" }).returning({ id: syncRuns.id });
  try {
    const result = await run();
    await db
      .update(syncRuns)
      .set({ status: "success", finishedAt: new Date(), booksCount: result.synced })
      .where(eq(syncRuns.id, syncRun.id));
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(syncRuns)
      .set({ status: "error", finishedAt: new Date(), errorMessage: message })
      .where(eq(syncRuns.id, syncRun.id));
    throw err;
  }
}

export type MetadataSyncResult = { synced: number; categoriesCount: number };

/** Fast: title/category/name fields only, no per-book Sefaria calls. Safe on a cron function's duration limit. */
export async function runMetadataOnlySync(): Promise<MetadataSyncResult> {
  return withSyncRun(async () => {
    const nodes = await getIndex();
    const flatBooks = flattenBooks(nodes);
    const grouped = groupByCategory(flatBooks);
    await upsertCategories(grouped);
    for (const b of flatBooks) {
      await upsertBookMetadata(b);
    }
    return { synced: flatBooks.length, categoriesCount: grouped.size };
  });
}

export type FullSyncResult = { synced: number; readableCount: number; categoriesCount: number };

/**
 * Slow: verifies real readability per book via schema-resolver (the same
 * logic BookPage uses for "Đọc từ đầu"). 1-20+ Sefaria calls per book across
 * 6,598 books — tens of minutes. CLI-only; do not call from a Vercel Function.
 */
export async function runFullCatalogSync(
  onProgress?: (synced: number, total: number, readableCount: number) => void,
): Promise<FullSyncResult> {
  return withSyncRun(async () => {
    const nodes = await getIndex();
    const flatBooks = flattenBooks(nodes);
    const grouped = groupByCategory(flatBooks);
    await upsertCategories(grouped);

    let synced = 0;
    let readableCount = 0;
    for (let i = 0; i < flatBooks.length; i += CONCURRENCY) {
      const chunk = flatBooks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map((b) => upsertBookWithVerification(b)));
      synced += chunk.length;
      readableCount += results.filter(Boolean).length;
      onProgress?.(synced, flatBooks.length, readableCount);
    }

    return { synced, readableCount, categoriesCount: grouped.size };
  });
}
