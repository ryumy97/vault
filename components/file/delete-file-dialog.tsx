"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

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
  skipRedirect?: boolean;
  onDeleted?: () => void;
};

function DeleteFileForm({ fileId, skipRedirect, onDeleted }: DeleteFileFormProps) {
  const [state, formAction, pending] = useActionState(deleteFileAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null && skipRedirect && onDeleted) {
      onDeleted();
    }
    wasPending.current = pending;
  }, [pending, skipRedirect, state.error, onDeleted]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="fileId" value={fileId} />
      {skipRedirect ? <input type="hidden" name="skipRedirect" value="1" /> : null}
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
  /** After delete, stay on the current page and refresh instead of redirecting to the parent folder. */
  skipRedirect?: boolean;
  showDefaultTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DeleteFileDialog({
  fileId,
  fileName,
  skipRedirect = false,
  showDefaultTrigger = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DeleteFileDialogProps) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setInstance((i) => i + 1);
    }
    setOpen(next);
  };

  const handleDeleted = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router, setOpen]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showDefaultTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm" className="gap-1.5">
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete file</DialogTitle>
          <DialogDescription>
            <span className="text-foreground">“{fileName}”</span> will be removed from this archive
            and from storage. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DeleteFileForm
          key={instance}
          fileId={fileId}
          skipRedirect={skipRedirect}
          onDeleted={skipRedirect ? handleDeleted : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
