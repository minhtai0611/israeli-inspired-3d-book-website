// Weekly Vercel Cron target (see vercel.json) — runs the FAST metadata-only
// sync (title/category/name fields, no per-book Sefaria verification calls),
// so it finishes well within a Vercel Function's duration limit regardless of
// catalog size. The slow, per-book readability verification
// (runFullCatalogSync) is CLI-only — see scripts/sync-sefaria-index.ts and
// src/lib/sync-catalog.ts for why.
import { runMetadataOnlySync } from "@/lib/sync-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMetadataOnlySync();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
