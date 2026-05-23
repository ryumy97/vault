"use client";

import {
  type UpdateDirectoryTagsState,
  updateDirectoryTagsAction,
} from "@/app/actions/server/update-directory-tags";
import { Badge } from "@/components/ui/badge";
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
import { isPresetTag, normalizeTags, PRESET_TAGS, tagToneClass } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useMemo, useState } from "react";

const initialState: UpdateDirectoryTagsState = { error: null };

type EditDirectoryTagsFieldsProps = {
  directory: Pick<Directory, "id" | "name" | "tags">;
  onSuccess: () => void;
};

function EditDirectoryTagsFields({ directory, onSuccess }: EditDirectoryTagsFieldsProps) {
  const [tags, setTags] = useState<string[]>(directory.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const tagsCsv = useMemo(() => tags.join(", "), [tags]);

  const nonColorTags = useMemo(() => tags.filter((t) => !isPresetTag(t)), [tags]);

  const [state, formAction, pending] = useActionState(
    async (_prev: UpdateDirectoryTagsState, formData: FormData) => {
      const result = await updateDirectoryTagsAction(initialState, formData);
      if (!result.error) {
        onSuccess();
      }
      return result;
    },
    initialState,
  );

  const toggleColorTag = (tag: string) => {
    setTags((current) => {
      const exists = current.some((t) => t.toLowerCase() === tag.toLowerCase());
      if (exists) {
        return current.filter((t) => t.toLowerCase() !== tag.toLowerCase());
      }
      return normalizeTags([...current, tag]);
    });
  };

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  };

  const addSingleTag = () => {
    const next = newTag.trim();
    if (!next) {
      return;
    }
    setTags((current) => normalizeTags([...current, next]));
    setNewTag("");
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="directoryId" value={directory.id} />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Color tags</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((tag) => {
            const selected = tags.some((t) => t.toLowerCase() === tag.toLowerCase());
            return (
              <button
                key={tag}
                type="button"
                disabled={pending}
                onClick={() => toggleColorTag(tag)}
                title={tag}
                aria-label={tag}
                className={cn(
                  "h-4 w-4 rounded-md border transition-opacity",
                  tagToneClass(tag),
                  selected ? "opacity-100" : "opacity-25 hover:opacity-100",
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Current tags (click to remove)</p>
        <div className="flex flex-wrap gap-1.5">
          {nonColorTags.length > 0 ? (
            nonColorTags.map((tag) => (
              <Badge key={tag} variant="secondary" asChild>
                <button type="button" disabled={pending} onClick={() => removeTag(tag)}>
                  {tag}
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`add-directory-tag-${directory.id}`} className="text-sm font-medium">
          Add tag
        </label>
        <div className="flex gap-2">
          <input
            id={`add-directory-tag-${directory.id}`}
            type="text"
            autoComplete="off"
            value={newTag}
            disabled={pending}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSingleTag();
              }
            }}
            placeholder="receipts"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
          />
          <Button type="button" variant="outline" disabled={pending} onClick={addSingleTag}>
            Add
          </Button>
        </div>
      </div>
      <input type="hidden" name="tags" value={tagsCsv} />
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
          {pending ? "Saving…" : "Save tags"}
        </Button>
      </div>
    </form>
  );
}

type EditDirectoryTagsDialogProps = {
  directory: Pick<Directory, "id" | "name" | "tags">;
  showDefaultTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function EditDirectoryTagsDialog({
  directory,
  showDefaultTrigger = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditDirectoryTagsDialogProps) {
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
      {showDefaultTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Edit tags
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit folder tags</DialogTitle>
          <DialogDescription>
            Toggle color tags, remove existing tags, and add one new tag at a time for{" "}
            <span className="font-medium">{directory.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <EditDirectoryTagsFields key={instance} directory={directory} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
