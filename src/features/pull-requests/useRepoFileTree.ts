'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ancestorFolders,
  buildFileTree,
  folderedPath,
  isTreeItem,
  listedPaths,
  rowKey,
  treePath,
  visibleRows,
  type TreeRow,
} from './fileTreeNodes';
import type { RepoFiles } from './repoFileStore';

export interface RepoFileTree {
  rows: TreeRow[];
  navItems: string[];
  shown: number;
  total: number;
  isOpen: (path: string) => boolean;
  toggle: (path: string) => void;
  selectItem: (item: string) => void;
  activateItem: (item: string) => void;
}

export function useRepoFileTree({
  repoFiles,
  query,
  selected,
  onSelect,
}: {
  repoFiles: RepoFiles;
  query: string;
  selected: string | null;
  onSelect: (item: string) => void;
}): RepoFileTree {
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const listed = useMemo(() => listedPaths(repoFiles, query), [repoFiles, query]);
  const nodes = useMemo(() => buildFileTree(listed.shown), [listed.shown]);
  const filtering = query.trim() !== '';
  const isOpen = useCallback((path: string) => filtering || opened.has(path), [filtering, opened]);
  const rows = useMemo(() => visibleRows(nodes, isOpen), [nodes, isOpen]);
  const toggle = useCallback((path: string) => setOpened((held) => withToggled(held, path)), []);

  useEffect(() => {
    if (selected !== null) setOpened((held) => withOpened(held, ancestorFolders(treePath(selected))));
  }, [selected]);

  const selectItem = useCallback(
    (item: string) => {
      if (isTreeItem(item)) onSelect(item);
    },
    [onSelect],
  );
  const activateItem = useCallback(
    (item: string) => {
      const folder = folderedPath(item);
      if (folder !== null) toggle(folder);
      selectItem(item);
    },
    [selectItem, toggle],
  );

  return {
    rows,
    navItems: useMemo(() => rows.map(rowKey), [rows]),
    shown: listed.shown.length,
    total: listed.total,
    isOpen,
    toggle,
    selectItem,
    activateItem,
  };
}

function withToggled(held: ReadonlySet<string>, path: string): ReadonlySet<string> {
  const next = new Set(held);
  if (!next.delete(path)) next.add(path);
  return next;
}

function withOpened(held: ReadonlySet<string>, folders: string[]): ReadonlySet<string> {
  if (folders.every((folder) => held.has(folder))) return held;
  return new Set([...held, ...folders]);
}
