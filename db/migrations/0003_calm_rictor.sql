ALTER TABLE "directories" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;