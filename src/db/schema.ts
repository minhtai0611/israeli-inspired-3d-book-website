// Metadata/search foundation for mirroring the Sefaria index into Postgres, plus
// anonymous (no-login) reader retention tables. None of this is wired to a live
// connection here — /thu-vien, /sach, /doc, and /tim-kiem still read straight from
// the Sefaria API. This is the schema + sync target described in the fix plan
// (§4.6/§4.7): a foundation to build on once a synced dataset exists, not a
// replacement for the live fetch path today.
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
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
// a cookie/localStorage, not a user account.
export const readingHistory = pgTable("reading_history", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
});

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: serial("id").primaryKey(),
    clientId: text("client_id").notNull(),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("reading_progress_client_book_unique").on(t.clientId, t.book)],
);

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  verse: integer("verse"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
