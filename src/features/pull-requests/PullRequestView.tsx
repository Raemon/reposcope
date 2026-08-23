'use client';

import { useEffect, useState } from 'react';
import { ChangeCounts } from './ChangeCounts';
import { DiffPanes } from './DiffPanes';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import type { ChangedFile, PullRequestCommits } from './pullRequests';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';

const ROW = 'flex w-full items-baseline gap-1.5 px-1.5 py-[1px] text-left text-[11px] leading-4';
const WHOLE_PULL = 'all';

export function PullRequestView({ owner, repo, number }: { owner: string; repo: string; number: number }) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const [pull, setPull] = useState<PullRequestCommits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>(WHOLE_PULL);
  const [files, setFiles] = useState<ChangedFile[] | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [commitSize, setCommitSize] = useState<ColumnSize>({ width: 260, open: true });
  const [fileSize, setFileSize] = useState<ColumnSize>({ width: 280, open: true });

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setPull(null);
    setError(null);
    setSelection(WHOLE_PULL);
    apiJson<PullRequestCommits>(
      `/api/github/pull?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&number=${number}`,
      token,
      controller.signal,
    )
      .then((loaded) => {
        setPull(loaded);
        setCommitSize((size) => ({ ...size, open: loaded.commits.length > 1 }));
      })
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [owner, repo, number, token, ready]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setFiles(null);
    setFileError(null);
    setPath(null);
    const repoParams = `owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}`;
    const source =
      selection === WHOLE_PULL
        ? `/api/github/pull-files?${repoParams}&number=${number}`
        : `/api/github/commit?${repoParams}&sha=${selection}`;
    apiJson<ChangedFile[]>(source, token, controller.signal)
      .then((loaded) => {
        setFiles(loaded);
        setPath(loaded[0]?.filename ?? null);
      })
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setFileError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [owner, repo, number, selection, token, ready]);

  if (error) return <p className="px-2 py-1 text-[11px] text-error-ink">{error}</p>;
  if (!pull) return <p className="px-2 py-1 text-[11px] text-ink-dim">Loading #{number}…</p>;

  const file = files?.find((candidate) => candidate.filename === path) ?? null;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-baseline gap-2 border-b border-panel-edge bg-panel px-2 py-[2px] text-[11px] leading-4">
        <span className="shrink-0 text-accent">#{pull.pull.number}</span>
        <span className="min-w-0 flex-1 truncate text-ink">{pull.pull.title}</span>
        <span className="shrink-0 text-[9px] text-ink-dim">
          {pull.pull.author} · {pull.headRef} → {pull.baseRef} · {timeAgo(pull.pull.updatedAt)}
        </span>
      </header>
      <div className="flex min-h-0 flex-1">
        <ResizableColumn icon="◆" title={`commits · ${pull.commits.length}`} size={commitSize} onSize={setCommitSize}>
          <button
            type="button"
            onClick={() => setSelection(WHOLE_PULL)}
            className={`${ROW} ${selection === WHOLE_PULL ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
          >
            <span className="min-w-0 flex-1 truncate">all changes</span>
            <ChangeCounts additions={pull.additions} deletions={pull.deletions} />
          </button>
          {pull.commits.map((commit) => (
            <button
              key={commit.sha}
              type="button"
              onClick={() => setSelection(commit.sha)}
              className={`${ROW} ${commit.sha === selection ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
            >
              <span className="shrink-0 text-[9px] text-ink-dim">{commit.sha.slice(0, 7)}</span>
              <span className="min-w-0 flex-1 truncate">{commit.message}</span>
              <span className="shrink-0 text-[9px] text-ink-dim">{timeAgo(commit.date)}</span>
            </button>
          ))}
        </ResizableColumn>
        <ResizableColumn icon="▤" title={`files · ${files?.length ?? 0}`} size={fileSize} onSize={setFileSize}>
          {fileError !== null ? (
            <p className="px-1.5 py-[1px] text-[11px] leading-4 text-error-ink">{fileError}</p>
          ) : files === null ? (
            <p className="px-1.5 py-[1px] text-[11px] leading-4 text-ink-dim">Loading…</p>
          ) : (
            files.map((candidate) => (
              <button
                key={candidate.filename}
                type="button"
                onClick={() => setPath(candidate.filename)}
                title={candidate.filename}
                className={`${ROW} ${
                  candidate.filename === path ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-right [direction:rtl]">{candidate.filename}</span>
                <ChangeCounts additions={candidate.additions} deletions={candidate.deletions} />
              </button>
            ))
          )}
        </ResizableColumn>
        <DiffPanes file={file} />
      </div>
    </div>
  );
}
