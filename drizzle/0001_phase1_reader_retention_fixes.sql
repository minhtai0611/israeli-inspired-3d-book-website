ALTER TABLE "bookmarks" ALTER COLUMN "client_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bookmarks" ALTER COLUMN "chapter" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "reading_history" ALTER COLUMN "client_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "reading_history" ALTER COLUMN "chapter" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "reading_progress" ALTER COLUMN "client_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "reading_progress" ALTER COLUMN "chapter" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "address_type" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "first_valid_ref" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "is_readable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "section_count" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "verified_at" timestamp with time zone;