import { FileIcon, Folder } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateDirectoryForm } from "@/components/create-directory-form";
import {
  getDirectoryByPath,
  listChildDirectories,
  listFilesInDirectory,
} from "@/db/actions";

function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) {
    return String(bytes);
  }
  if (n < 1024) {
    return `${n} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = v >= 10 || i === 0 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded} ${units[i]}`;
}

export default async function Home() {
  const root = await getDirectoryByPath("/");

  if (!root) {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>No root folder</CardTitle>
            <CardDescription>
              Run migrations, then seed the <code className="font-mono text-xs">root</code>{" "}
              directory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              yarn db:migrate{"\n"}yarn db:seed
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [childDirs, fileRecords] = await Promise.all([
    listChildDirectories(root.id),
    listFilesInDirectory(root.id),
  ]);

  const sortedDirs = [...childDirs].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const sortedFiles = [...fileRecords].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <header className="mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Archive
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{root.name}</span>
          <span className="mx-1.5 text-muted-foreground/60">·</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {root.path}
          </code>
        </p>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Folders
          </h2>
          <div className="mb-4">
            <CreateDirectoryForm parentId={root.id} />
          </div>
          {sortedDirs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No folders in this directory.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              {sortedDirs.map((dir) => (
                <li
                  key={dir.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl"
                >
                  <Folder
                    className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {dir.name}
                  </span>
                  <code className="ml-auto truncate font-mono text-xs text-muted-foreground">
                    {dir.path}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Files
          </h2>
          {sortedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files in this directory.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              {sortedFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl"
                >
                  <FileIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
                    {formatBytes(file.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
