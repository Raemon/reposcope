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
import { Note } from '@/features/surface-ui/Note';

const AT_ONCE = 40;

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
  const read = useMemo(() => shown.filter((path) => !isImagePath(path)), [shown]);
  const { texts, hold } = useHeldTexts();
  const files = useMemo(() => readableFiles(shown, texts), [shown, texts]);
  const waiting = read.filter((path) => !texts.has(path)).length;

  if (paths.length === 0)
    return <Note tone="dim" className="flex-1">No files directly in this folder — open a subfolder.</Note>;
  return (
    <ReviewThreadProvider owner={owner} repo={repo} number={null}>
      {read.map((path) => (
        <FileTextLoader key={path} owner={owner} repo={repo} refName={refName} path={path} onText={hold} />
      ))}
      {waiting > 0 ? (
        <Note tone="dim" className="flex-1">Loading {waiting} of {read.length} files…</Note>
      ) : (
        <FolderPanes owner={owner} repo={repo} refName={refName} files={files} />
      )}
      <FolderNotes left={paths.length - shown.length} skipped={waiting > 0 ? 0 : shown.length - files.length} />
    </ReviewThreadProvider>
  );
}

function FolderPanes({
  owner,
  repo,
  refName,
  files,
}: {
  owner: string;
  repo: string;
  refName: string;
  files: ChangedFile[];
}) {
  const fileSet = useMemo(() => wholeFileSetOf(refName, files), [refName, files]);
  if (files.length === 0) return <Note tone="dim" className="flex-1">None of these files can be shown here.</Note>;
  return <DiffPanes owner={owner} repo={repo} fileSet={fileSet} files={files} selected={null} sortable={false} />;
}

function FolderNotes({ left, skipped }: { left: number; skipped: number }) {
  return (
    <>
      {left > 0 && <Note tone="dim" className="shrink-0">{left} more files in this folder — open them one at a time.</Note>}
      {skipped > 0 && <Note tone="dim" className="shrink-0">{skipped} files left out — too large to show, or unreadable.</Note>}
    </>
  );
}

function useHeldTexts() {
  const [texts, setTexts] = useState<ReadonlyMap<string, string | null>>(() => new Map());
  const hold = useCallback((path: string, text: string | null) => setTexts((held) => new Map(held).set(path, text)), []);
  return { texts, hold };
}

function FileTextLoader({
  owner,
  repo,
  refName,
  path,
  onText,
}: {
  owner: string;
  repo: string;
  refName: string;
  path: string;
  onText: (path: string, text: string | null) => void;
}) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data, error } = useCachedJson<FileText>(fileTextPath(owner, repo, refName, path), token, ready);
  const text = data?.text ?? null;
  useEffect(() => {
    if (data || error) onText(path, text);
  }, [data, error, text, path, onText]);
  return null;
}

function readableFiles(paths: string[], texts: ReadonlyMap<string, string | null>): ChangedFile[] {
  return paths
    .filter((path) => (isImagePath(path) ? true : (texts.get(path) ?? null) !== null))
    .map((path) => wholeFileEntry(path, texts.get(path) ?? null));
}
