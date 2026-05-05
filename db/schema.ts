import {
  bigint,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Arbitrary key–value metadata for a file (e.g. EXIF / image inspector fields).
 * Values are JSON-serializable; prefer strings for display-oriented fields.
 */
export type FileMetadataKv = Record<string, string | number | boolean | null>;
export type ItemTags = string[];

/**
 * Folder tree. Store one logical root row (e.g. parentId null, path `/`) via migration or app bootstrap.
 * - `path` is a normalized full path (e.g. `/`, `/documents`, `/documents/photos`) and must stay in sync with parent/name when you move or rename folders.
 * - Sibling names are unique per parent (`parentId` + `name`), including a single root (`NULLS NOT DISTINCT` so only one `(null, name)` row per name).
 */
export const directories = pgTable(
  "directories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id"),
    name: varchar("name", { length: 255 }).notNull(),
    path: varchar("path", { length: 2048 }).notNull().unique(),
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: "directories_parent_id_directories_id_fk",
    }).onDelete("cascade"),
    unique("directories_parent_name_unique").on(t.parentId, t.name).nullsNotDistinct(),
    index("directories_parent_id_idx").on(t.parentId),
  ],
);

/**
 * File metadata; bytes live in R2 at `r2ObjectKey`.
 * - `name` is the basename within `directoryId`; full path is implicit (`directory.path` + `/` + `name`) and should match R2 layout if you mirror paths in keys.
 * - `metadata` stores optional key–value JSON (dimensions, camera, exposure, colour profile, etc.).
 * - `sourceFileCreatedAt` / `sourceFileModifiedAt` come from the client `File` when uploading (e.g. OS mtimes), not DB row timestamps.
 */
export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    directoryId: uuid("directory_id")
      .notNull()
      .references(() => directories.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    r2ObjectKey: varchar("r2_object_key", { length: 1024 }).notNull().unique(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    contentType: varchar("content_type", { length: 255 }),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    metadata: jsonb("metadata").$type<FileMetadataKv | null>(),
    tags: text("tags").array().notNull().default([]),
    /** From the uploaded `File` when the client supplies it (often unavailable in browsers). */
    sourceFileCreatedAt: timestamp("source_file_created_at", {
      withTimezone: true,
      mode: "date",
    }),
    /** From `File.lastModified` (OS last-write time) when uploading from the browser. */
    sourceFileModifiedAt: timestamp("source_file_modified_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    unique("files_directory_name_unique").on(t.directoryId, t.name),
    index("files_directory_id_idx").on(t.directoryId),
  ],
);

export type Directory = typeof directories.$inferSelect;
export type NewDirectory = typeof directories.$inferInsert;
export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
