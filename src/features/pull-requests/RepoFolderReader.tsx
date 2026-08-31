'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DiffPanes } from './DiffPanes';
import { isImagePath } from './imageFiles';
import { fileTextPath } from './pullPaths';
import type { ChangedFile, FileText } from './pullRequests';
import { ReviewThreadProvider } from './reviewThreadStore';
import { wholeFileEntry } from './wholeFileEntry';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

const NOTE = 'flex-1 px-2 py-1 text-[11px] text-ink-dim';
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
  const [texts, setTexts] = useState<ReadonlyMap<string, string | null>>(() => new Map());
  const hold = useCallback((path: string, text: string | null) => setTexts((held) => withText(held, path, text)), []);
  const shown = useMemo(() => paths.slice(0, AT_ONCE), [paths]);
  const files = useMemo(() => readableFiles(shown, texts), [shown, texts]);

  if (paths.length === 0) return <p className={NOTE}>No files directly in this folder — open a subfolder.</p>;
  return (
    <ReviewThreadProvider owner={owner} repo={repo} number={null}>
      {shown.filter((path) => !isImagePath(path)).map((path) => (
        <FileTextLoader key={path} owner={owner} repo={repo} refName={refName} path={path} onText={hold} />
      ))}
      {files.length === 0 ? (
        <p className={NOTE}>Loading…</p>
      ) : (
        <DiffPanes owner={owner} repo={repo} fileSet={{ baseRef: refName, headRef: refName, files }} files={files} selected={null} />
      )}
      {paths.length > shown.length && (
        <p className="shrink-0 px-2 py-1 text-[11px] text-ink-dim">
          {paths.length - shown.length} more files in this folder — open them one at a time.
        </p>
      )}
    </ReviewThreadProvider>
  );
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

function withText(held: ReadonlyMap<string, string | null>, path: string, text: string | null) {
  return new Map(held).set(path, text);
}

function readableFiles(paths: string[], texts: ReadonlyMap<string, string | null>): ChangedFile[] {
  return paths
    .filter((path) => isImagePath(path) || texts.has(path))
    .map((path) => wholeFileEntry(path, texts.get(path) ?? null));
}
