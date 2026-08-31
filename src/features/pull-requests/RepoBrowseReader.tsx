'use client';

import { useEffect, useMemo, useState } from 'react';
import { folderedPath, folderFilePaths, treePath } from './fileTreeNodes';
import { RepoFileReader } from './RepoFileReader';
import { RepoFolderReader } from './RepoFolderReader';
import type { RepoFileSet } from './repoFiles';

const SETTLE_MS = 150;

export function RepoBrowseReader({
  owner,
  repo,
  fileSet,
  item,
}: {
  owner: string;
  repo: string;
  fileSet: RepoFileSet;
  item: string;
}) {
  const settled = useSettled(item, SETTLE_MS);
  const folder = folderedPath(settled);
  const paths = useMemo(() => (folder === null ? [] : folderFilePaths(fileSet.files, folder)), [fileSet, folder]);
  const path = treePath(settled);
  if (folder !== null)
    return <RepoFolderReader key={`${fileSet.ref}:${folder}`} owner={owner} repo={repo} refName={fileSet.ref} paths={paths} />;
  return path === null ? null : <RepoFileReader owner={owner} repo={repo} refName={fileSet.ref} path={path} />;
}

function useSettled<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
