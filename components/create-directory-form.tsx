"use client";

import { FolderPlus } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { createDirectoryAction } from "@/app/actions/server/create-directory";
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

const initialState = { error: null as string | null };

type CreateDirectoryFormProps = {
  parentId: string;
};

type FieldsProps = {
  parentId: string;
  onSuccess: () => void;
};

function CreateDirectoryDialogFields({ parentId, onSuccess }: FieldsProps) {
  const [state, formAction, pending] = useActionState(
    createDirectoryAction,
    initialState,
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null) {
      onSuccess();
    }
    wasPending.current = pending;
  }, [pending, state.error, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="parentId" value={parentId} />
      <div className="flex flex-col gap-2">
        <label htmlFor="folder-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="folder-name"
          name="name"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. Documents"
          disabled={pending}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
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
          {pending ? "Creating…" : "Create folder"}
        </Button>
      </div>
    </form>
  );
}

export function CreateDirectoryForm({ parentId }: CreateDirectoryFormProps) {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  const handleSuccess = useCallback(() => {
    setOpen(false);
  }, []);

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
        <Button type="button" className="gap-1.5">
          <FolderPlus className="size-4" />
          New folder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Choose a name for the folder in this directory.
          </DialogDescription>
        </DialogHeader>
        <CreateDirectoryDialogFields
          key={instance}
          parentId={parentId}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
