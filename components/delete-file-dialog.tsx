"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { deleteFileAction } from "@/app/actions/server/delete-file";
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

const initialState: { error: string | null } = { error: null };

type DeleteFileFormProps = {
  fileId: string;
};

function DeleteFileForm({ fileId }: DeleteFileFormProps) {
  const [state, formAction, pending] = useActionState(deleteFileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="fileId" value={fileId} />
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

type DeleteFileDialogProps = {
  fileId: string;
  fileName: string;
};

export function DeleteFileDialog({ fileId, fileName }: DeleteFileDialogProps) {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

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
        <Button type="button" variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="size-4" aria-hidden />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete file</DialogTitle>
          <DialogDescription>
            <span className="text-foreground">“{fileName}”</span> will be removed from this archive
            and from storage. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DeleteFileForm key={instance} fileId={fileId} />
      </DialogContent>
    </Dialog>
  );
}
