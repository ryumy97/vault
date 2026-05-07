"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useNotificationTunnel } from "./notification-tunnel";

export type UploadTaskStatus = "preparing" | "uploading" | "saving" | "done" | "error";

export type UploadTask = {
  id: string;
  fileName: string;
  finalName?: string;
  status: UploadTaskStatus;
  error?: string;
};

export type UploadBatchNotification = {
  id: string;
  label: string;
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

export function UploadProgressNotificationCard({
  task,
  index,
}: {
  task: UploadTask;
  index: number;
}) {
  const { expand, setExpand } = useNotificationTunnel();

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
      className="absolute bottom-0 right-0 object-top-left w-full"
      initial={{ opacity: 0, x: "100%" }}
      animate={
        expand
          ? {
              y: 0,
              x: 0,
              scale: 1,
              opacity: 1,
            }
          : {
              y: -index * 24,
              x: index * 24,
              scale: 1 - index * 0.05,
              opacity: Math.max(0, 1 - index / 10),
            }
      }
      exit={{ opacity: 0, x: "100%" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={
        !expand
          ? {
              position: "absolute",
              zIndex: 100 - index,
            }
          : {
              position: "relative",
              zIndex: 100 - index,
            }
      }
      layout
      onClick={() => setExpand(!expand)}
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

export function UploadBatchNotificationCard({
  notification,
  index,
}: {
  notification: UploadBatchNotification;
  index: number;
}) {
  const { expand, setExpand } = useNotificationTunnel();

  return (
    <motion.div
      key={notification.id}
      className="absolute bottom-0 right-0 object-top-left w-full"
      initial={{ opacity: 0, x: "100%" }}
      animate={
        expand
          ? {
              y: 0,
              x: 0,
              scale: 1,
              opacity: 1,
            }
          : {
              y: -index * 24,
              x: index * 24,
              scale: 1 - index * 0.05,
              opacity: Math.max(0, 1 - index / 10),
            }
      }
      exit={{ opacity: 0, x: "100%" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={
        !expand
          ? {
              position: "absolute",
              zIndex: 100 - index,
            }
          : {
              position: "relative",
              zIndex: 100 - index,
            }
      }
      layout
      onClick={() => setExpand(!expand)}
    >
      <Alert className="shadow-md">
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        <AlertTitle>{notification.label}</AlertTitle>
        <AlertDescription>Upload is in progress…</AlertDescription>
      </Alert>
    </motion.div>
  );
}
