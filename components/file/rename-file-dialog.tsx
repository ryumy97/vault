"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useCallback, useState } from "react";
import { type RenameFileState, renameFileAction } from "@/app/actions/server/rename-file";
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
import type { FileRecord } from "@/db/schema";

const initialState: { error: string | null } = { error: null };

type RenameFileFieldsProps = {
  file: Pick<FileRecord, "id" | "name">;
  onSuccess: () => void;
};

function RenameFileFields({ file, onSuccess }: RenameFileFieldsProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: RenameFileState, formData: FormData) => {
      const result = await renameFileAction(initialState, formData);
      if (!result.error) {
        onSuccess();
      }

      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="fileId" value={file.id} />
      <div className="flex flex-col gap-2">
        <label htmlFor={`rename-file-${file.id}`} className="text-sm font-medium">
          New name
        </label>
        <input
          id={`rename-file-${file.id}`}
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={file.name}
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

type RenameFileDialogProps = {
  file: Pick<FileRecord, "id" | "name">;
  showDefaultTrigger?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function RenameFileDialog({
  file,
  showDefaultTrigger = true,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RenameFileDialogProps) {
  const router = useRouter();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setInstance((i) => i + 1);
      }
      setOpen(next);
    },
    [setOpen],
  );

  const handleSuccess = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router, setOpen]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      {!trigger && showDefaultTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Rename
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription>
            Updates how this file appears in the archive. The stored content is unchanged.
          </DialogDescription>
        </DialogHeader>
        <RenameFileFields key={instance} file={file} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
