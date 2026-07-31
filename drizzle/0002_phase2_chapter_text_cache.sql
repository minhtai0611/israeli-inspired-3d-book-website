CREATE TABLE "chapter_text_cache" (
	"ref" text PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
