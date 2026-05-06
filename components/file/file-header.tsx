"use client";

import { updateFileTagsAction } from "@/app/actions/server/update-file-tags";
import { DeleteFileDialog } from "@/components/file/delete-file-dialog";
import { FileEntryIcon } from "@/components/file/file-entry-icon";
import { RenameFileDialog } from "@/components/file/rename-file-dialog";
import { notificationTunnel } from "@/components/notification-tunnel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import type { Directory, FileRecord } from "@/db";
import { directoryBreadcrumbAncestors, hrefForDirectoryPath } from "@/lib/directory-url";
import { isPresetTag, PRESET_TAGS, tagToneClass } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Pencil } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "../ui/badge";

export function FileHeader({ file, parent }: { file: FileRecord; parent: Directory }) {
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);

  const initialNonColorTags = useMemo(() => file.tags.filter((t) => !isPresetTag(t)), [file.tags]);

  const [newTag, setNewTag] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [addTagOpen, setAddTagOpen] = useState(false);
  const [nonColorTags, setNonColorTags] = useState<string[]>(initialNonColorTags);
  const [selectedColorTags, setSelectedColorTags] = useState<string[]>(
    file.tags.filter((t) => isPresetTag(t)),
  );
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; description: string; variant: "default" | "destructive" }>
  >([]);

  const [isSavingColorTags, startSavingColorTags] = useTransition();

  const pushNotification = (
    title: string,
    description: string,
    variant: "default" | "destructive" = "default",
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((current) => [...current, { id, title, description, variant }]);
    window.setTimeout(() => {
      setNotifications((current) => current.filter((n) => n.id !== id));
    }, 2200);
  };

  const ancestors = directoryBreadcrumbAncestors(file.directoryId);

  const commitNewTag = () => {
    const tag = newTag.trim();
    setAddTagOpen(false);
    if (!tag) {
      setNewTag("");
      return;
    }

    const existsInNonColor = nonColorTags.some((t) => t.toLowerCase() === tag.toLowerCase());
    const existsInColor = selectedColorTags.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (existsInNonColor || existsInColor) {
      setNewTag("");
      pushNotification("Tag unchanged", `${tag} tag already exists`);
      return;
    }

    startSavingColorTags(async () => {
      const nextNonColorTags = [...nonColorTags, tag];
      const nextTagsCsv = [...nextNonColorTags, ...selectedColorTags].join(", ");
      const formData = new FormData();
      formData.set("fileId", file.id);
      formData.set("tags", nextTagsCsv);
      const result = await updateFileTagsAction({ error: null }, formData);
      if (result.error) {
        pushNotification("Could not update tags", result.error, "destructive");
        return;
      }
      setNonColorTags(nextNonColorTags);
      setNewTag("");
      pushNotification("Tag added", `Added ${tag} tag`);
      router.refresh();
    });
  };

  return (
    <>
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={hrefForDirectoryPath("/")}>Archive</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {ancestors.map((a) => (
            <Fragment key={a.dbPath}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={hrefForDirectoryPath(a.dbPath)}>{a.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          ))}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={hrefForDirectoryPath(parent.path)}>{parent.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{file.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-8 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
          <FileEntryIcon name={file.name} contentType={file.contentType} className="size-10" />
          <div className="flex flex-col">
            <div className="min-w-0 flex-1 flex gap-2 items-center">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                {file.name}
              </h1>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setRenameOpen(true)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
              <RenameFileDialog
                file={file}
                showDefaultTrigger={false}
                open={renameOpen}
                onOpenChange={setRenameOpen}
              />
            </div>
            {/* Tags */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESET_TAGS.map((tag) => {
                    const selected = selectedColorTags.some(
                      (t) => t.toLowerCase() === tag.toLowerCase(),
                    );
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          startSavingColorTags(async () => {
                            const nextColorTags = selected
                              ? selectedColorTags.filter(
                                  (t) => t.toLowerCase() !== tag.toLowerCase(),
                                )
                              : [...selectedColorTags, tag];
                            const nextTagsCsv = [...nonColorTags, ...nextColorTags].join(", ");
                            const formData = new FormData();
                            formData.set("fileId", file.id);
                            formData.set("tags", nextTagsCsv);
                            const result = await updateFileTagsAction({ error: null }, formData);
                            if (result.error) {
                              pushNotification(
                                "Could not update tags",
                                result.error,
                                "destructive",
                              );
                              return;
                            }
                            setSelectedColorTags(nextColorTags);
                            pushNotification(
                              selected ? "Tag removed" : "Tag added",
                              `${selected ? "Removed" : "Added"} ${tag} tag`,
                            );
                            router.refresh();
                          });
                        }}
                        aria-label={tag}
                        title={tag}
                        disabled={isSavingColorTags}
                        className={cn(
                          "h-4 w-4 rounded-md border cursor-pointer transition-opacity",
                          tagToneClass(tag),
                          selected ? "opacity-100" : "opacity-25 hover:opacity-100",
                          isSavingColorTags && "cursor-not-allowed",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {nonColorTags.map((tag) => (
                  <Badge key={tag} variant={"secondary"} asChild>
                    <button
                      type="button"
                      disabled={isSavingColorTags}
                      className="cursor-pointer"
                      onClick={() => {
                        startSavingColorTags(async () => {
                          const nextNonColorTags = nonColorTags.filter(
                            (t) => t.toLowerCase() !== tag.toLowerCase(),
                          );
                          const nextTagsCsv = [...nextNonColorTags, ...selectedColorTags].join(
                            ", ",
                          );
                          const formData = new FormData();
                          formData.set("fileId", file.id);
                          formData.set("tags", nextTagsCsv);
                          const result = await updateFileTagsAction({ error: null }, formData);
                          if (result.error) {
                            pushNotification("Could not update tags", result.error, "destructive");
                            return;
                          }
                          setNonColorTags(nextNonColorTags);
                          pushNotification("Tag removed", `Removed ${tag} tag`);
                          router.refresh();
                        });
                      }}
                    >
                      {tag}
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1.5">
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={!addTagOpen ? { opacity: 1, width: 69 } : { opacity: 0, width: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setAddTagOpen(true);
                        inputRef.current?.focus();
                      }}
                    >
                      Add tags
                    </Button>
                  </motion.div>
                  <motion.input
                    ref={inputRef}
                    initial={{ opacity: 0, width: 0 }}
                    animate={addTagOpen ? { opacity: 1, width: 69 } : { opacity: 0, width: 0 }}
                    transition={{ duration: 0.3 }}
                    type="text"
                    placeholder="Add a tag"
                    className="h-6 rounded border border-input bg-background px-2 text-xs text-foreground"
                    value={newTag}
                    disabled={isSavingColorTags}
                    onChange={(e) => setNewTag(e.target.value)}
                    onBlur={commitNewTag}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitNewTag();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DeleteFileDialog fileId={file.id} fileName={file.name} />
      </header>
      <notificationTunnel.In>
        {notifications.map((n) => (
          <Alert key={n.id} variant={n.variant} className="shadow-md">
            {n.variant === "destructive" ? (
              <AlertCircle className="size-4 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2
                className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
            )}
            <AlertTitle>{n.title}</AlertTitle>
            <AlertDescription>{n.description}</AlertDescription>
          </Alert>
        ))}
      </notificationTunnel.In>
    </>
  );
}
