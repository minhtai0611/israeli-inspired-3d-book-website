import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// DATABASE_URL must be Neon's pooled connection string (-pooler host, PgBouncer on 6543),
// not the direct one — each Vercel Function invocation can spin up its own pool, and direct
// connections exhaust Neon's max_connections under concurrent load. See Neon's connection
// pooling docs (serverless functions = many short-lived connections → use the pooled endpoint).
// `max` is kept low because that limit applies per pool instance, i.e. per warm serverless
// instance, not globally across all of them.
export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
