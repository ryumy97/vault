"use client";

import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { deleteDirectoryAction } from "@/app/actions/server/delete-directory";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Directory } from "@/db/schema";

const initialState: { error: string | null } = { error: null };

type DeleteDirectoryFormProps = {
  directoryId: string;
  onDeleted?: () => void;
};

function DeleteDirectoryForm({ directoryId, onDeleted }: DeleteDirectoryFormProps) {
  const [state, formAction, pending] = useActionState(deleteDirectoryAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null && onDeleted) {
      onDeleted();
    }
    wasPending.current = pending;
  }, [pending, state.error, onDeleted]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="directoryId" value={directoryId} />
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
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
      </div>
    </form>
  );
}

type DeleteDirectoryDialogProps = {
  directory: Pick<Directory, "id" | "name" | "path">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteDirectoryDialog({
  directory,
  open,
  onOpenChange,
}: DeleteDirectoryDialogProps) {
  const router = useRouter();
  const [instance, setInstance] = useState(0);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setInstance((i) => i + 1);
    }
    onOpenChange(next);
  };

  const handleDeleted = useCallback(() => {
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete folder</DialogTitle>
          <DialogDescription>
            <span className="text-foreground">“{directory.name}”</span> and everything inside it
            will be removed from this archive and from storage. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DeleteDirectoryForm key={instance} directoryId={directory.id} onDeleted={handleDeleted} />
      </DialogContent>
    </Dialog>
  );
}
