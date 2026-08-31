'use client';

import { useEffect, useMemo, useState } from 'react';
import { folderedPath, folderFilePaths, treePath } from './fileTreeNodes';
import { RepoFileReader } from './RepoFileReader';
import { RepoFolderReader } from './RepoFolderReader';
import type { RepoFileSet } from './repoFiles';
import type { RepoFileTree } from './useRepoFileTree';

const SETTLE_MS = 150;

export function RepoBrowseReader({
  owner,
  repo,
  fileSet,
  tree,
  item,
}: {
  owner: string;
  repo: string;
  fileSet: RepoFileSet;
  tree: RepoFileTree;
  item: string;
}) {
  const settled = useSettled(item, SETTLE_MS);
  const folder = settled === null ? null : folderedPath(settled);
  const paths = useMemo(() => (folder === null ? [] : folderFilePaths(tree.listed, folder)), [tree, folder]);
  if (settled === null) return null;
  if (folder !== null)
    return <RepoFolderReader key={`${fileSet.ref}:${folder}`} owner={owner} repo={repo} refName={fileSet.ref} paths={paths} />;
  const path = treePath(settled);
  return path === null ? null : <RepoFileReader owner={owner} repo={repo} refName={fileSet.ref} path={path} />;
}

function useSettled<T>(value: T, delayMs: number): T | null {
  const [settled, setSettled] = useState<T | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
