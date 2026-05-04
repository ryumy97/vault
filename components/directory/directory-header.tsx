"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Directory } from "@/db/schema";
import {
  directoryBreadcrumbAncestors,
  hrefForDirectoryPath,
  parentDirectoryDbPath,
} from "@/lib/directory-url";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { DeleteDirectoryDialog } from "./delete-directory-dialog";
import { RenameDirectoryDialog } from "./rename-directory-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "../ui/avatar";

type Props = {
  directory: Directory;
};

export const DirectoryHeader: React.FC<Props> = ({ directory }) => {
  const ancestors = directoryBreadcrumbAncestors(directory.path);
  const atRoot = directory.path === "/";

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const parentPath = parentDirectoryDbPath(directory.path);
  const redirectAfterDelete = parentPath !== null ? hrefForDirectoryPath(parentPath) : "/dir";

  return (
    <header className="mb-8 flex justify-between">
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src="/favicon.png" />
        </Avatar>
        <div className="flex flex-col">
          <Breadcrumb>
            <BreadcrumbList>
              {atRoot ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>Root</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={hrefForDirectoryPath("/")}>Root</Link>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <BreadcrumbPage className="flex items-center gap-2 data-[state=open]:[&_svg]:rotate-180">
                          {directory.name}
                          <ChevronDown className={cn("size-4 transition-transform")} aria-hidden />
                        </BreadcrumbPage>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-44">
                        <DropdownMenuItem
                          onClick={() => setRenameOpen(true)}
                          className="flex items-center gap-2"
                        >
                          <Pencil className="size-4" aria-hidden />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteOpen(true)} variant="destructive">
                          <Trash2 className="size-4" aria-hidden />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {directory.path}
            </code>
          </div>
        </div>
      </div>
      <RenameDirectoryDialog
        directory={directory}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        showDefaultTrigger={false}
        redirectAfter
      />
      <DeleteDirectoryDialog
        directory={directory}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectHref={redirectAfterDelete}
      />
    </header>
  );
};
