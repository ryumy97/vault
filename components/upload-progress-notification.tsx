"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type UploadTaskStatus = "preparing" | "uploading" | "saving" | "done" | "error";

export type UploadTask = {
  id: string;
  fileName: string;
  finalName?: string;
  status: UploadTaskStatus;
  error?: string;
};

function statusDescription(task: UploadTask): string {
  switch (task.status) {
    case "preparing":
      return "Preparing upload…";
    case "uploading":
      return "Sending bytes to storage…";
    case "saving":
      return "Saving file record…";
    case "done":
      return `Uploaded “${task.finalName ?? task.fileName}”.`;
    case "error":
      return task.error ?? "Upload failed.";
    default:
      return "";
  }
}

export function UploadProgressNotificationCard({ task }: { task: UploadTask }) {
  const pending =
    task.status === "preparing" || task.status === "uploading" || task.status === "saving";

  const variant = task.status === "error" ? "destructive" : "default";

  const icon = pending ? (
    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
  ) : task.status === "done" ? (
    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
  ) : (
    <AlertCircle className="size-4 shrink-0" aria-hidden />
  );

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      <Alert variant={variant} className="shadow-md">
        {icon}
        <AlertTitle className="truncate">{task.fileName}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{statusDescription(task)}</p>
          {pending ? (
            <div
              className="h-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuetext={task.status}
              aria-busy="true"
            >
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-all duration-500",
                  task.status === "preparing" && "w-1/4",
                  task.status === "uploading" && "w-2/3",
                  task.status === "saving" && "w-full",
                )}
              />
            </div>
          ) : null}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
