import { notFound } from "next/navigation";

import { DirectoryBrowser } from "@/components/directory-browser";
import { RootSeedPrompt } from "@/components/root-seed-prompt";
import {
  getDirectoryByPath,
  listChildDirectories,
  listFilesInDirectory,
} from "@/db/actions";
import { hrefForDirectoryPath, parentDirectoryDbPath } from "@/lib/directory-url";

type PageProps = {
  params: Promise<{ path?: string[] }>;
};

function pathFromSegments(segments: string[] | undefined): string {
  const parts =
    segments?.map((s) => decodeURIComponent(s)).filter(Boolean) ?? [];
  if (parts.length === 0) {
    return "/";
  }
  return `/${parts.join("/")}`;
}

export default async function DirectoryPathPage({ params }: PageProps) {
  const { path: segments } = await params;
  const dbPath = pathFromSegments(segments);
  const directory = await getDirectoryByPath(dbPath);

  if (!directory) {
    if (dbPath === "/") {
      return <RootSeedPrompt />;
    }
    notFound();
  }

  const [childDirs, fileRecords] = await Promise.all([
    listChildDirectories(directory.id),
    listFilesInDirectory(directory.id),
  ]);

  const parentPath = parentDirectoryDbPath(directory.path);
  const backHref =
    parentPath === null ? undefined : hrefForDirectoryPath(parentPath);

  return (
    <DirectoryBrowser
      directory={directory}
      childDirs={childDirs}
      files={fileRecords}
      backHref={backHref}
    />
  );
}
