'use client';

import { RepoFileTreeRows } from './RepoFileTreeRows';
import type { RepoFiles } from './repoFileStore';
import type { RepoFileTree } from './useRepoFileTree';

const NOTE = 'px-1.5 py-[1px] text-[11px] leading-4';
const FILTER =
  'w-full border-b border-panel-edge bg-panel px-1.5 py-[2px] text-[11px] leading-4 text-ink outline-none placeholder:text-ink-dim';

export function RepoFileList({
  repoFiles,
  tree,
  selected,
  onSelect,
  query,
  onQuery,
}: {
  repoFiles: RepoFiles;
  tree: RepoFileTree;
  selected: string | null;
  onSelect: (path: string) => void;
  query: string;
  onQuery: (next: string) => void;
}) {
  return (
    <>
      <input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="filter files…"
        aria-label="Filter files"
        className={FILTER}
      />
      <FileRows repoFiles={repoFiles} tree={tree} selected={selected} onSelect={onSelect} />
    </>
  );
}

function FileRows({
  repoFiles,
  tree,
  selected,
  onSelect,
}: {
  repoFiles: RepoFiles;
  tree: RepoFileTree;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const { fileSet, error } = repoFiles;
  if (!fileSet) return <p className={`${NOTE} ${error ? 'text-error-ink' : 'text-ink-dim'}`}>{error ?? 'Loading…'}</p>;
  return (
    <>
      <RepoFileTreeRows tree={tree} selected={selected} onSelect={onSelect} />
      <ListFoot shown={tree.shown} total={tree.total} truncated={fileSet.truncated} />
    </>
  );
}

function ListFoot({ shown, total, truncated }: { shown: number; total: number; truncated: boolean }) {
  if (total === 0) return <p className={`${NOTE} text-ink-dim`}>No matching files.</p>;
  if (shown < total) return <p className={`${NOTE} text-ink-dim`}>{total - shown} more — narrow the filter.</p>;
  if (truncated) return <p className={`${NOTE} text-ink-dim`}>Listing truncated by GitHub.</p>;
  return null;
}
