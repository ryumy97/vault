"use client";

import { Pencil } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { renameDirectoryAction } from "@/app/actions/server/rename-directory";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Directory } from "@/db/schema";

const initialState: { error: string | null } = { error: null };

type RenameDirectoryDialogProps = {
  directory: Pick<Directory, "id" | "name" | "path">;
  /** Navigate to the new folder URL after rename (current folder in header). */
  redirectAfter?: boolean;
};

type FieldsProps = {
  directory: Pick<Directory, "id" | "name" | "path">;
  redirectAfter: boolean;
  onSuccess: () => void;
};

function RenameDirectoryFields({
  directory,
  redirectAfter,
  onSuccess,
}: FieldsProps) {
  const [state, formAction, pending] = useActionState(
    renameDirectoryAction,
    initialState,
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (
      wasPending.current &&
      !pending &&
      state.error === null &&
      !redirectAfter
    ) {
      onSuccess();
    }
    wasPending.current = pending;
  }, [pending, redirectAfter, state.error, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="directoryId" value={directory.id} />
      {redirectAfter ? (
        <input type="hidden" name="redirectAfter" value="1" />
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor={`rename-${directory.id}`} className="text-sm font-medium">
          New name
        </label>
        <input
          id={`rename-${directory.id}`}
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={directory.name}
          disabled={pending}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Renaming…" : "Rename"}
        </Button>
      </div>
    </form>
  );
}

export function RenameDirectoryDialog({
  directory,
  redirectAfter = false,
}: RenameDirectoryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setInstance((i) => i + 1);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Rename ${directory.name}`}
        >
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename folder</DialogTitle>
          <DialogDescription>
            Path <code className="font-mono text-xs">{directory.path}</code>{" "}
            updates for this folder and everything inside it.
          </DialogDescription>
        </DialogHeader>
        <RenameDirectoryFields
          key={instance}
          directory={directory}
          redirectAfter={redirectAfter}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
