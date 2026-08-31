'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DiffPanes } from './DiffPanes';
import { isImagePath } from './imageFiles';
import { fileTextPath } from './pullPaths';
import type { ChangedFile, FileText } from './pullRequests';
import { ReviewThreadProvider } from './reviewThreadStore';
import { wholeFileEntry, wholeFileSetOf } from './wholeFileEntry';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

const NOTE = 'flex-1 px-2 py-1 text-[11px] text-ink-dim';
const FOOT = 'shrink-0 px-2 py-1 text-[11px] text-ink-dim';
const AT_ONCE = 40;

type Read = { text: string | null; failed: boolean };

export function RepoFolderReader({
  owner,
  repo,
  refName,
  paths,
}: {
  owner: string;
  repo: string;
  refName: string;
  paths: string[];
}) {
  const shown = useMemo(() => paths.slice(0, AT_ONCE), [paths]);
  const { reads, hold } = useFolderReads();
  const files = useMemo(() => readableFiles(shown, reads), [shown, reads]);

  if (paths.length === 0) return <p className={NOTE}>No files directly in this folder — open a subfolder.</p>;
  return (
    <ReviewThreadProvider owner={owner} repo={repo} number={null}>
      {shown.filter((path) => !isImagePath(path)).map((path) => (
        <FileTextLoader key={path} owner={owner} repo={repo} refName={refName} path={path} onRead={hold} />
      ))}
      {files.length === 0 ? (
        <p className={NOTE}>Loading…</p>
      ) : (
        <DiffPanes owner={owner} repo={repo} fileSet={wholeFileSetOf(refName, files)} files={files} selected={null} />
      )}
      <FolderNotes left={paths.length - shown.length} failed={failedCount(reads)} />
    </ReviewThreadProvider>
  );
}

function FolderNotes({ left, failed }: { left: number; failed: number }) {
  return (
    <>
      {left > 0 && <p className={FOOT}>{left} more files in this folder — open them one at a time.</p>}
      {failed > 0 && <p className={FOOT}>{failed} of these files could not be read.</p>}
    </>
  );
}

function useFolderReads() {
  const [reads, setReads] = useState<ReadonlyMap<string, Read>>(() => new Map());
  const hold = useCallback((path: string, read: Read) => setReads((held) => new Map(held).set(path, read)), []);
  return { reads, hold };
}

function FileTextLoader({
  owner,
  repo,
  refName,
  path,
  onRead,
}: {
  owner: string;
  repo: string;
  refName: string;
  path: string;
  onRead: (path: string, read: Read) => void;
}) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data, error } = useCachedJson<FileText>(fileTextPath(owner, repo, refName, path), token, ready);
  const text = data?.text ?? null;
  useEffect(() => {
    if (data || error) onRead(path, { text, failed: error !== null });
  }, [data, error, text, path, onRead]);
  return null;
}

function failedCount(reads: ReadonlyMap<string, Read>): number {
  return [...reads.values()].filter((read) => read.failed).length;
}

function readableFiles(paths: string[], reads: ReadonlyMap<string, Read>): ChangedFile[] {
  return paths
    .filter((path) => isImagePath(path) || reads.has(path))
    .map((path) => wholeFileEntry(path, reads.get(path)?.text ?? null));
}
