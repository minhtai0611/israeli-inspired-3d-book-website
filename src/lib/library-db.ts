// DB-backed replacement for fetching the live Sefaria index — same FlatBook[]
// shape as flattenBooks(await getIndex()), so callers keep using the existing,
// tested library.ts helpers (groupByCategory/sortCategories/searchBooks)
// unchanged. Only the source of the book list changes; scoring, diacritic
// folding, and grouping logic all stay exactly as verified in library.test.ts.
//
// Reads only books verified readable by scripts/sync-sefaria-index.ts
// (isReadable = true) — the point of this table is to stop listing books
// that don't actually resolve to content on the primary read path.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import type { FlatBook } from "@/lib/library";

function toFlatBook(row: typeof books.$inferSelect): FlatBook {
  return {
    title: row.title,
    heTitle: row.heTitle,
    categoryPath: [row.categoryKey],
    shortDesc: row.enShortDesc ?? undefined,
  };
}

export async function getReadableBooksFromDb(): Promise<FlatBook[]> {
  const rows = await db.select().from(books).where(eq(books.isReadable, true));
  return rows.map(toFlatBook);
}
