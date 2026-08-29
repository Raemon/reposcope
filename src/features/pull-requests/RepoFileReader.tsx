'use client';

import { useMemo } from 'react';
import { DiffPanes } from './DiffPanes';
import { isImagePath } from './imageFiles';
import { fileTextPath } from './pullPaths';
import type { FileText } from './pullRequests';
import { wholeFileSet } from './wholeFileEntry';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export function RepoFileReader({
  owner,
  repo,
  refName,
  path,
}: {
  owner: string;
  repo: string;
  refName: string;
  path: string;
}) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const wantsText = !isImagePath(path);
  const route = wantsText ? fileTextPath(owner, repo, refName, path) : null;
  const { data, error } = useCachedJson<FileText>(route, token, ready);
  const fileSet = useMemo(() => readableFileSet(refName, path, wantsText, data), [refName, path, wantsText, data]);

  if (error) return <p className="flex-1 px-2 py-1 text-[11px] text-error-ink">{error}</p>;
  if (wantsText && data?.text === null) return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">File too large to show.</p>;
  return <DiffPanes owner={owner} repo={repo} fileSet={fileSet} files={fileSet?.files ?? []} selected={path} />;
}

function readableFileSet(refName: string, path: string, wantsText: boolean, data: FileText | null) {
  if (!wantsText) return wholeFileSet(refName, path, null);
  return data?.text == null ? null : wholeFileSet(refName, path, data.text);
}
