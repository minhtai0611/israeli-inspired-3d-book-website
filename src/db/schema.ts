// Metadata/search foundation for mirroring the Sefaria index into Postgres, plus
// anonymous (no-login) reader retention tables. /thu-vien, /thu-vien/[category],
// and /tim-kiem read from `books`/`categories` here (src/lib/library-db.ts),
// falling back to the live Sefaria index if the DB is unreachable or hasn't
// been synced yet. /doc's chapter text is mirrored on read into
// chapter_text_cache (7-day staleness window) by getText() in
// src/lib/sefaria.ts; /sach's book-index (table of contents) still isn't
// mirrored. See docs/db-sync.md and
// scripts/sync-sefaria-index.ts / src/lib/sync-catalog.ts for how `books` gets
// populated and verified. reading_history/reading_progress mirror the
// localStorage-based reader state (src/lib/reader-storage.ts) via
// src/app/api/progress/sync/route.ts; bookmarks has no writer yet — no
// bookmarking UI exists in the reader.
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Sefaria category key, e.g. "Tanakh"
  nameEn: text("name_en").notNull(),
  nameVi: text("name_vi"),
  descVi: text("desc_vi"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().unique(), // Sefaria canonical title, e.g. "Genesis"
  heTitle: text("he_title").notNull(),
  categoryKey: text("category_key")
    .notNull()
    .references(() => categories.key),
  enShortDesc: text("en_short_desc"),
  heShortDesc: text("he_short_desc"),
  nameVi: text("name_vi"),
  blurbVi: text("blurb_vi"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Address scheme from src/lib/schema-resolver.ts's classifyAddressKind, e.g. "talmud". */
  addressType: text("address_type", { enum: ["integer", "talmud", "complex", "unknown"] }),
  /** First ref verified to have real content (findFirstReadableRef) — what "Đọc từ đầu" should use. */
  firstValidRef: text("first_valid_ref"),
  /** True once verifiedAt confirms firstValidRef resolves to non-empty content. */
  isReadable: boolean("is_readable").notNull().default(false),
  /** Number of top-level chapters/daf/named sections (resolveStructure(...).items.length). */
  sectionCount: integer("section_count"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const bookAliases = pgTable(
  "book_aliases",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(), // alternate spelling/search term, e.g. "Bereshit", "Sáng Thế"
  },
  (t) => [unique("book_aliases_book_alias_unique").on(t.bookId, t.alias)],
);

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status", { enum: ["running", "success", "error"] })
    .notNull()
    .default("running"),
  booksCount: integer("books_count"),
  errorMessage: text("error_message"),
});

// Anonymous (no auth) reader retention — keyed by a client-generated id stored in
// localStorage (src/lib/client-id.ts), not a user account. `chapter` is the same
// URL segment ReaderView/reader-storage.ts already use — text, not integer,
// since it's not always numeric (Talmud daf like "2a", complex-schema sections
// like "Introduction"; see src/lib/schema-resolver.ts).
export const readingHistory = pgTable("reading_history", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").notNull(),
  book: text("book").notNull(),
  chapter: text("chapter").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
});

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: serial("id").primaryKey(),
    clientId: uuid("client_id").notNull(),
    book: text("book").notNull(),
    chapter: text("chapter").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("reading_progress_client_book_unique").on(t.clientId, t.book)],
);

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").notNull(),
  book: text("book").notNull(),
  chapter: text("chapter").notNull(),
  verse: integer("verse"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Stale-while-revalidate mirror of getText() (src/lib/sefaria.ts) responses,
// keyed by the same ref string passed to getText. Only ever holds real
// content — sefariaFetch already throws before a 200-with-`{error}` payload
// reaches a caller, so nothing here is a cached error page.
export const chapterTextCache = pgTable("chapter_text_cache", {
  ref: text("ref").primaryKey(),
  content: jsonb("content").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

// Stale-while-revalidate mirror of getAudioCantillation()'s (src/lib/sefaria.ts) trimmed
// `media` array — NOT a mirror of the raw Sefaria `related_api` response, which bundles
// multi-MB of links/sheets/topics/manuscripts alongside the media we actually want (16MB
// for "Genesis 1" alone, verified live 2026-08-02) and is too large/slow to fetch live on
// every page view. PocketTorah's recordings are effectively static, hence the much longer
// TTL than chapterTextCache.
export const audioCantillationCache = pgTable("audio_cantillation_cache", {
  ref: text("ref").primaryKey(),
  clips: jsonb("clips").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
