"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

import { finalizeClientUpload, prepareClientUpload } from "@/app/actions/server/upload-file";
import { notificationTunnel } from "@/components/notification-tunnel";
import { Button } from "@/components/ui/button";
import {
  UploadProgressNotificationCard,
  type UploadTask,
} from "@/components/upload-progress-notification";
import { exifTimestampToMs, extractUploadMetadata } from "@/lib/extract-upload-metadata";
import { cn } from "@/lib/utils";

type DirectoryDropZoneProps = {
  directoryId: string;
  children: ReactNode;
};

const DONE_DISMISS_MS = 2800;
const ERROR_DISMISS_MS = 7000;

export function DirectoryDropZone({ directoryId, children }: DirectoryDropZoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const list = files.filter((f) => f.name && f.size >= 0);
      if (!list.length) {
        return;
      }

      setError(null);
      setBusy(true);

      const uploadOne = async (file: File) => {
        const id = crypto.randomUUID();
        setUploadTasks((prev) => [...prev, { id, fileName: file.name, status: "preparing" }]);

        const patch = (updates: Partial<UploadTask>) => {
          setUploadTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
        };

        try {
          const prep = await prepareClientUpload(
            directoryId,
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

          const metadata = await extractUploadMetadata(file);
          const sourceFileCreatedMs = exifTimestampToMs(metadata?.["Source file created"]);
          const fin = await finalizeClientUpload(
            directoryId,
            prep.r2ObjectKey,
            prep.finalName,
            file.size,
            file.type || undefined,
            metadata,
            sourceFileCreatedMs || file.lastModified,
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
      };

      try {
        await Promise.all(list.map((file) => uploadOne(file)));
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [directoryId, router],
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
      const { files } = e.dataTransfer;
      if (!files?.length) {
        return;
      }
      await uploadFiles(Array.from(files));
    },
    [uploadFiles],
  );

  const onFileInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (!files?.length) {
        return;
      }
      await uploadFiles(Array.from(files));
      e.target.value = "";
    },
    [uploadFiles],
  );

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: whole-area drag target; file input + "Choose files" covers keyboard users */}
      <div
        className="relative"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={onFileInputChange}
        />

        <div
          className={cn(
            "rounded-xl transition-[box-shadow,background-color] duration-150",
            active && "bg-primary/5 ring-2 ring-primary ring-inset",
          )}
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Drag and drop files anywhere in this folder, or choose files to upload.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" aria-hidden />
              {busy ? "Uploading…" : "Choose files"}
            </Button>
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
              Drop files to upload
            </p>
          </div>
        ) : null}
      </div>

      {uploadTasks.map((task) => (
        <notificationTunnel.In key={task.id}>
          <UploadProgressNotificationCard task={task} />
        </notificationTunnel.In>
      ))}
    </>
  );
}
