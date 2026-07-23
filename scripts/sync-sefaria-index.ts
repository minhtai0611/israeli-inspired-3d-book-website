// Mirrors the Sefaria /index tree into Postgres (categories/books/book_aliases),
// so pages can eventually read from a fast local table instead of re-fetching a
// ~5MB JSON blob from Sefaria on every request (see fix-plan §4.6 — the build log
// literally shows "items over 2MB can not be cached" for that fetch today).
//
// Requires DATABASE_URL to point at a real, reachable Postgres instance.
// Usage: npm run sync:sefaria
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { books, bookAliases, categories, syncRuns } from "../src/db/schema";
import { getIndex } from "../src/lib/sefaria";
import { CATEGORY_ORDER, flattenBooks, groupByCategory } from "../src/lib/library";
import { viBook, viCategory } from "../src/lib/vi";

async function main() {
  const [run] = await db.insert(syncRuns).values({ status: "running" }).returning({ id: syncRuns.id });

  try {
    const nodes = await getIndex();
    const flatBooks = flattenBooks(nodes);
    const grouped = groupByCategory(flatBooks);

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

    let synced = 0;
    for (const b of flatBooks) {
      const categoryKey = b.categoryPath[0] ?? "Reference";
      const vi = viBook(b.title);

      const [row] = await db
        .insert(books)
        .values({
          title: b.title,
          heTitle: b.heTitle,
          categoryKey,
          enShortDesc: b.shortDesc,
          nameVi: vi?.name,
          blurbVi: vi?.blurb,
        })
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

      if (vi?.name) {
        await db
          .insert(bookAliases)
          .values({ bookId: row.id, alias: vi.name })
          .onConflictDoNothing();
      }
      synced += 1;
    }

    await db
      .update(syncRuns)
      .set({ status: "success", finishedAt: new Date(), booksCount: synced })
      .where(eq(syncRuns.id, run.id));

    console.log(`Synced ${synced} books across ${grouped.size} categories.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(syncRuns)
      .set({ status: "error", finishedAt: new Date(), errorMessage: message })
      .where(eq(syncRuns.id, run.id));
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("sync-sefaria-index failed:", err);
  process.exitCode = 1;
});
