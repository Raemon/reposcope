'use client';

import { useMemo } from 'react';
import { FileTreeRow } from './FileTreeRow';
import type { RepoFiles } from './repoFileStore';

const NOTE = 'px-1.5 py-[1px] text-[11px] leading-4';
const FILTER =
  'w-full border-b border-panel-edge bg-panel px-1.5 py-[2px] text-[11px] leading-4 text-ink outline-none placeholder:text-ink-dim';
const SHOWN_LIMIT = 400;
const BROWSE_PREFIX = 'file:';

export function browseKey(path: string): string {
  return `${BROWSE_PREFIX}${path}`;
}

export function browsedPath(item: string): string | null {
  return item.startsWith(BROWSE_PREFIX) ? item.slice(BROWSE_PREFIX.length) : null;
}

export function listedPaths(repoFiles: RepoFiles, query: string): { shown: string[]; total: number } {
  const paths = repoFiles.fileSet?.files ?? [];
  const wanted = query.trim().toLowerCase();
  const matching = wanted ? paths.filter((path) => path.toLowerCase().includes(wanted)) : paths;
  return { shown: matching.slice(0, SHOWN_LIMIT), total: matching.length };
}

export function RepoFileList({
  repoFiles,
  selected,
  onSelect,
  query,
  onQuery,
}: {
  repoFiles: RepoFiles;
  selected: string | null;
  onSelect: (path: string) => void;
  query: string;
  onQuery: (next: string) => void;
}) {
  const listed = useMemo(() => listedPaths(repoFiles, query), [repoFiles, query]);
  return (
    <>
      <input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="filter files…"
        aria-label="Filter files"
        className={FILTER}
      />
      <FileRows repoFiles={repoFiles} listed={listed} selected={selected} onSelect={onSelect} />
    </>
  );
}

function FileRows({
  repoFiles,
  listed,
  selected,
  onSelect,
}: {
  repoFiles: RepoFiles;
  listed: { shown: string[]; total: number };
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const { fileSet, error } = repoFiles;
  if (!fileSet) return <p className={`${NOTE} ${error ? 'text-error-ink' : 'text-ink-dim'}`}>{error ?? 'Loading…'}</p>;
  return (
    <>
      {listed.shown.map((path) => (
        <FileTreeRow
          key={path}
          path={path}
          navKey={browseKey(path)}
          selected={path === selected}
          onSelect={() => onSelect(path)}
        />
      ))}
      <ListFoot shown={listed.shown.length} total={listed.total} truncated={fileSet.truncated} />
    </>
  );
}

function ListFoot({ shown, total, truncated }: { shown: number; total: number; truncated: boolean }) {
  if (total === 0) return <p className={`${NOTE} text-ink-dim`}>No matching files.</p>;
  if (shown < total) return <p className={`${NOTE} text-ink-dim`}>{total - shown} more — narrow the filter.</p>;
  if (truncated) return <p className={`${NOTE} text-ink-dim`}>Listing truncated by GitHub.</p>;
  return null;
}
