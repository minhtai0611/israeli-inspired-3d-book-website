// Non-blocking sync target for ReaderView's chapter-view effect — mirrors the
// localStorage-based reading state (src/lib/reader-storage.ts) into
// reading_progress (current position, upserted) and reading_history (append
// log), keyed by the anonymous client id from src/lib/client-id.ts.
import { db } from "@/db";
import { readingHistory, readingProgress } from "@/db/schema";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SyncPayload = {
  clientId: string;
  bookTitle: string;
  chapterRef: string;
  verseNumber?: number;
};

function isValidPayload(body: unknown): body is SyncPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.clientId === "string" &&
    UUID_RE.test(b.clientId) &&
    typeof b.bookTitle === "string" &&
    b.bookTitle.length > 0 &&
    typeof b.chapterRef === "string" &&
    b.chapterRef.length > 0 &&
    (b.verseNumber === undefined || typeof b.verseNumber === "number")
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const { clientId, bookTitle, chapterRef } = body;

  try {
    await db
      .insert(readingProgress)
      .values({ clientId, book: bookTitle, chapter: chapterRef })
      .onConflictDoUpdate({
        target: [readingProgress.clientId, readingProgress.book],
        set: { chapter: chapterRef, updatedAt: new Date() },
      });
    await db.insert(readingHistory).values({ clientId, book: bookTitle, chapter: chapterRef });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
