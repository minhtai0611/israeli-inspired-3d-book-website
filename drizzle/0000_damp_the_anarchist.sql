CREATE TABLE "book_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "book_aliases_book_alias_unique" UNIQUE("book_id","alias")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"he_title" text NOT NULL,
	"category_key" text NOT NULL,
	"en_short_desc" text,
	"he_short_desc" text,
	"name_vi" text,
	"blurb_vi" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_vi" text,
	"desc_vi" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_progress_client_book_unique" UNIQUE("client_id","book")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"books_count" integer,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "book_aliases" ADD CONSTRAINT "book_aliases_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_category_key_categories_key_fk" FOREIGN KEY ("category_key") REFERENCES "public"."categories"("key") ON DELETE no action ON UPDATE no action;