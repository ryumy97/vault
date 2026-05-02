CREATE TABLE "directories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(255) NOT NULL,
	"path" varchar(2048) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "directories_path_unique" UNIQUE("path"),
	CONSTRAINT "directories_parent_name_unique" UNIQUE NULLS NOT DISTINCT("parent_id","name")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"directory_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"r2_object_key" varchar(1024) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_type" varchar(255),
	"checksum_sha256" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_r2_object_key_unique" UNIQUE("r2_object_key"),
	CONSTRAINT "files_directory_name_unique" UNIQUE("directory_id","name")
);
--> statement-breakpoint
ALTER TABLE "directories" ADD CONSTRAINT "directories_parent_id_directories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."directories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_directory_id_directories_id_fk" FOREIGN KEY ("directory_id") REFERENCES "public"."directories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "directories_parent_id_idx" ON "directories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "files_directory_id_idx" ON "files" USING btree ("directory_id");