import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DirectoryBrowser } from "@/components/directory/directory-browser";
import { RootSeedPrompt } from "@/components/root-seed-prompt";
import { getDirectoryByPath, listChildDirectories, listFilesInDirectory } from "@/db/actions";
import { DIRECTORY_VIEW_MODE_COOKIE, parseDirectoryViewMode } from "@/lib/view-mode";

type PageProps = {
  params: Promise<{ path?: string[] }>;
};

function pathFromSegments(segments: string[] | undefined): string {
  const parts = segments?.map((s) => decodeURIComponent(s)).filter(Boolean) ?? [];
  if (parts.length === 0) {
    return "/";
  }
  return `/${parts.join("/")}`;
}

export default function DirectoryPathPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <DirectoryContent params={params} />
    </Suspense>
  );
}

async function DirectoryContent({ params }: PageProps) {
  const cookieStore = await cookies();
  const viewMode = parseDirectoryViewMode(cookieStore.get(DIRECTORY_VIEW_MODE_COOKIE)?.value);

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

  return (
    <DirectoryBrowser
      directory={directory}
      childDirs={childDirs}
      files={fileRecords}
      viewMode={viewMode}
    />
  );
}
