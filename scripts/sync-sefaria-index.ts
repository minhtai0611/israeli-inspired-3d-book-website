// CLI entry point for the full catalog sync — see src/lib/sync-catalog.ts for
// the actual logic (shared with the lightweight cron endpoint). This is the
// only place that should call runFullCatalogSync: it makes 1-20+ live Sefaria
// calls per book across the whole catalog (tens of minutes), which does not
// fit in a Vercel Function's execution limit.
//
// Requires DATABASE_URL to point at a real, reachable Postgres instance.
// Usage: npm run sync:sefaria
import "dotenv/config";
import { pool } from "../src/db";
import { runFullCatalogSync } from "../src/lib/sync-catalog";

async function main() {
  const startedAt = Date.now();
  const result = await runFullCatalogSync((synced, total, readableCount) => {
    if (synced % 200 === 0 || synced === total) {
      const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
      console.log(`${synced}/${total} books processed, ${readableCount} readable (${elapsedMin} min elapsed)`);
    }
  });
  console.log(
    `Synced ${result.synced} books across ${result.categoriesCount} categories — ${result.readableCount} verified readable.`,
  );
}

main()
  .catch((err) => {
    console.error("sync-sefaria-index failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
