"use client";

import { FolderUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

import { ensureDirectoryPathFromRoot } from "@/app/actions/server/ensure-directory-path";
import { finalizeClientUpload, prepareClientUpload } from "@/app/actions/server/upload-file";
import { notificationTunnel } from "@/components/notification-tunnel";
import { Button } from "@/components/ui/button";
import {
  UploadProgressNotificationCard,
  type UploadTask,
} from "@/components/upload-progress-notification";
import {
  collectFilesFromDroppedDirectory,
  getDataTransferEntry,
} from "@/lib/collect-dropped-directory-files";
import { extractUploadMetadata } from "@/lib/extract-upload-metadata";
import { parseFolderFileRelativePath } from "@/lib/folder-upload-path";
import { cn } from "@/lib/utils";

type DirectoryDropZoneProps = {
  directoryId: string;
  children: ReactNode;
};

const DONE_DISMISS_MS = 2800;
const ERROR_DISMISS_MS = 7000;
const MAX_FOLDER_FILES = 3000;

/** Skip hidden / dotfiles (e.g. `.DS_Store`, `.env`). */
function isUploadableFileName(name: string): boolean {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "";
  return base.length > 0 && !base.startsWith(".");
}

type UploadJob = {
  targetDirectoryId: string;
  file: File;
  /** Shown in progress UI (flat name or full relative path). */
  label: string;
};

export function DirectoryDropZone({ directoryId, children }: DirectoryDropZoneProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  const uploadOneJob = useCallback(async (job: UploadJob) => {
    const { targetDirectoryId, file, label } = job;
    const id = crypto.randomUUID();
    setUploadTasks((prev) => [...prev, { id, fileName: label, status: "preparing" }]);

    const patch = (updates: Partial<UploadTask>) => {
      setUploadTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    };

    try {
      const prep = await prepareClientUpload(
        targetDirectoryId,
        file.name,
        file.type || undefined,
        file.size,
      );
      if (!prep.ok) {
        throw new Error(prep.error);
      }
      patch({ status: "uploading", finalName: prep.finalName });

      const putRes = await fetch(prep.uploadUrl, {
        method: "PUT",
        body: file,
        headers: prep.headers,
      });
      if (!putRes.ok) {
        throw new Error(
          `Storage upload failed (${putRes.status}). Check R2 CORS allows PUT from this origin.`,
        );
      }

      patch({ status: "saving" });

      const { metadata, sourceFileCreatedMs } = await extractUploadMetadata(file);
      const fin = await finalizeClientUpload(
        targetDirectoryId,
        prep.r2ObjectKey,
        prep.finalName,
        file.size,
        file.type || undefined,
        metadata,
        sourceFileCreatedMs,
        file.lastModified,
      );
      if (!fin.ok) {
        throw new Error(fin.error);
      }

      patch({ status: "done", finalName: prep.finalName });
      window.setTimeout(() => {
        setUploadTasks((prev) => prev.filter((t) => t.id !== id));
      }, DONE_DISMISS_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      patch({ status: "error", error: message });
      window.setTimeout(() => {
        setUploadTasks((prev) => prev.filter((t) => t.id !== id));
      }, ERROR_DISMISS_MS);
    }
  }, []);

  const runJobs = useCallback(
    async (jobs: UploadJob[]) => {
      if (!jobs.length) {
        return;
      }
      setError(null);
      setBusy(true);
      try {
        await Promise.all(jobs.map((j) => uploadOneJob(j)));
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [router, uploadOneJob],
  );

  const uploadFlatFiles = useCallback(
    async (files: File[]) => {
      const list = files.filter((f) => f.name && f.size >= 0 && isUploadableFileName(f.name));
      if (!list.length) {
        return;
      }
      const jobs: UploadJob[] = list.map((file) => ({
        targetDirectoryId: directoryId,
        file,
        label: file.name,
      }));
      await runJobs(jobs);
    },
    [directoryId, runJobs],
  );

  const uploadFolderFiles = useCallback(
    async (files: File[]) => {
      const list = files.filter((f) => f.name && f.size >= 0 && isUploadableFileName(f.name));
      if (!list.length) {
        return;
      }
      if (list.length > MAX_FOLDER_FILES) {
        setError(`This folder has too many files (max ${MAX_FOLDER_FILES}).`);
        return;
      }

      const jobs: UploadJob[] = [];
      for (const file of list) {
        const wkp = file.webkitRelativePath?.trim();
        if (!wkp) {
          setError("Could not read folder structure for one or more files.");
          return;
        }
        const parsed = parseFolderFileRelativePath(wkp);
        if (!parsed) {
          setError(`Invalid path in folder upload: ${wkp}`);
          return;
        }
        const relativeDir = parsed.dirSegments.join("/");
        const ensured = await ensureDirectoryPathFromRoot(directoryId, relativeDir);
        if (!ensured.ok) {
          setError(ensured.error);
          return;
        }
        jobs.push({
          targetDirectoryId: ensured.directoryId,
          file,
          label: wkp,
        });
      }

      await runJobs(jobs);
    },
    [directoryId, runJobs],
  );

  const uploadDroppedFolderEntries = useCallback(
    async (entries: FileSystemDirectoryEntry[]) => {
      const collected: Array<{ relativePath: string; file: File }> = [];
      for (const root of entries) {
        collected.push(...(await collectFilesFromDroppedDirectory(root)));
      }
      const visible = collected.filter((c) => isUploadableFileName(c.file.name));
      if (visible.length > MAX_FOLDER_FILES) {
        setError(`This folder has too many files (max ${MAX_FOLDER_FILES}).`);
        return;
      }
      if (!visible.length) {
        return;
      }

      const jobs: UploadJob[] = [];
      for (const { relativePath, file } of visible) {
        const parsed = parseFolderFileRelativePath(relativePath);
        if (!parsed) {
          setError(`Invalid path in folder upload: ${relativePath}`);
          return;
        }
        const relativeDir = parsed.dirSegments.join("/");
        const ensured = await ensureDirectoryPathFromRoot(directoryId, relativeDir);
        if (!ensured.ok) {
          setError(ensured.error);
          return;
        }
        jobs.push({
          targetDirectoryId: ensured.directoryId,
          file,
          label: relativePath,
        });
      }

      await runJobs(jobs);
    },
    [directoryId, runJobs],
  );

  const onDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setActive(true);
    }
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) {
      return;
    }
    setActive(false);
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setActive(false);
      const dt = e.dataTransfer;
      if (!dt) {
        return;
      }

      const items = dt.items?.length ? Array.from(dt.items) : [];
      if (items.length > 0) {
        const entries = items
          .map((it) => getDataTransferEntry(it))
          .filter((x): x is FileSystemEntry => x != null);
        const onlyDirs = entries.length > 0 && entries.every((en) => en.isDirectory);
        if (onlyDirs) {
          await uploadDroppedFolderEntries(entries as FileSystemDirectoryEntry[]);
          return;
        }
      }

      const { files } = dt;
      if (files?.length) {
        const list = Array.from(files);
        const folderMode = list.some((f) => Boolean(f.webkitRelativePath));
        if (folderMode) {
          await uploadFolderFiles(list);
        } else {
          await uploadFlatFiles(list);
        }
      }
    },
    [uploadDroppedFolderEntries, uploadFlatFiles, uploadFolderFiles],
  );

  const onFileInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (!files?.length) {
        return;
      }
      await uploadFlatFiles(Array.from(files));
      e.target.value = "";
    },
    [uploadFlatFiles],
  );

  const onFolderInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (!files?.length) {
        return;
      }
      await uploadFolderFiles(Array.from(files));
      e.target.value = "";
    },
    [uploadFolderFiles],
  );

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: whole-area drag target; file inputs cover uploads */}
      <div
        className="relative"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={onFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          {...{ webkitdirectory: "" }}
          onChange={onFolderInputChange}
        />

        <div
          className={cn(
            "rounded-xl transition-[box-shadow,background-color] duration-150",
            active && "bg-primary/5 ring-2 ring-primary ring-inset",
          )}
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Drag and drop files or a folder here, choose files, or upload an entire folder (same
              structure as on your disk).
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" aria-hidden />
                {busy ? "Uploading…" : "Choose files"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={busy}
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderUp className="size-4" aria-hidden />
                {busy ? "Uploading…" : "Choose folder"}
              </Button>
            </div>
          </div>

          {error ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {children}
        </div>

        {active ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/85 backdrop-blur-[2px]"
            aria-live="polite"
          >
            <p className="rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border">
              Drop files or folder to upload
            </p>
          </div>
        ) : null}
      </div>

      <notificationTunnel.In>
        {uploadTasks.map((task, index) => (
          <UploadProgressNotificationCard key={task.id} task={task} index={index} />
        ))}
      </notificationTunnel.In>
    </>
  );
}
