import { db } from "@/db";
import { books, syncRuns } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const [lastRun] = await db
      .select({ finishedAt: syncRuns.finishedAt, booksCount: syncRuns.booksCount })
      .from(syncRuns)
      .where(eq(syncRuns.status, "success"))
      .orderBy(desc(syncRuns.finishedAt))
      .limit(1);
    const [{ readableCount }] = await db
      .select({ readableCount: sql<number>`count(*) filter (where ${books.isReadable})::int` })
      .from(books);
    return Response.json({
      ok: true,
      lastSync: lastRun?.finishedAt ?? null,
      booksCount: lastRun?.booksCount ?? null,
      readableCount,
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
