'use client';

import { useEffect, useRef, useState } from 'react';
import { ChangeCounts } from './ChangeCounts';
import { ChangedFileTree } from './ChangedFileTree';
import { DiffPanes, type DiffPanesHandle } from './DiffPanes';
import { PullDiscussion } from './PullDiscussion';
import { PullRequestList } from './PullRequestMenu';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import { setCurrentPull } from './currentPullStore';
import type { ChangedFileSet, PullRequestCommits } from './pullRequests';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';
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
  const [fileSet, setFileSet] = useState<ChangedFileSet | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [listSize, setListSize] = useState<ColumnSize>({ width: 300, open: false });
  const [discussionSize, setDiscussionSize] = useState<ColumnSize>({ width: 320, open: false });
  const [commitSize, setCommitSize] = useState<ColumnSize>({ width: 260, open: true });
  const [fileSize, setFileSize] = useState<ColumnSize>({ width: 280, open: true });
  const diffPanes = useRef<DiffPanesHandle>(null);

  useEffect(() => () => setCurrentPull(null), []);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setPull(null);
    setError(null);
    setSelection(WHOLE_PULL);
    setCurrentPull(null);
    apiJson<PullRequestCommits>(
      `/api/github/pull?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&number=${number}`,
      token,
      controller.signal,
    )
      .then((loaded) => {
        setPull(loaded);
        setCurrentPull(loaded);
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
    setFileSet(null);
    setFileError(null);
    setPath(null);
    const repoParams = `owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}`;
    const source =
      selection === WHOLE_PULL
        ? `/api/github/pull-files?${repoParams}&number=${number}`
        : `/api/github/commit?${repoParams}&sha=${selection}`;
    apiJson<ChangedFileSet>(source, token, controller.signal)
      .then((loaded) => {
        setFileSet(loaded);
        setPath(loaded.files[0]?.filename ?? null);
      })
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setFileError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [owner, repo, number, selection, token, ready]);

  if (error) return <p className="px-2 py-1 text-[11px] text-error-ink">{error}</p>;
  if (!pull) return <p className="px-2 py-1 text-[11px] text-ink-dim">Loading #{number}…</p>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        <ResizableColumn icon="⇅" title="pull requests" size={listSize} onSize={setListSize}>
          <PullRequestList repo={{ owner, name: repo }} />
        </ResizableColumn>
        <ResizableColumn icon="❝" title="discussion" size={discussionSize} onSize={setDiscussionSize}>
          <PullDiscussion owner={owner} repo={repo} number={number} author={pull.pull.author} body={pull.body} />
        </ResizableColumn>
        <ResizableColumn icon="◆" title={`commits · ${pull.commits.length}`} size={commitSize} onSize={setCommitSize}>
          <SelectableRow
            onActivate={() => setSelection(WHOLE_PULL)}
            className={`${ROW} ${selection === WHOLE_PULL ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
          >
            <span className="min-w-0 flex-1 truncate">all changes</span>
            <ChangeCounts additions={pull.additions} deletions={pull.deletions} />
          </SelectableRow>
          {pull.commits.map((commit) => (
            <SelectableRow
              key={commit.sha}
              onActivate={() => setSelection(commit.sha)}
              className={`${ROW} ${commit.sha === selection ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
            >
              <span className="shrink-0 text-[9px] text-ink-dim/50">{commit.sha.slice(0, 7)}</span>
              <span className="min-w-0 flex-1 truncate">{commit.message}</span>
              <RelativeTime iso={commit.date} className="shrink-0 text-[9px] text-ink-dim" />
            </SelectableRow>
          ))}
        </ResizableColumn>
        <ResizableColumn icon="▤" title={`files · ${fileSet?.files.length ?? 0}`} size={fileSize} onSize={setFileSize}>
          {fileError !== null ? (
            <p className="px-1.5 py-[1px] text-[11px] leading-4 text-error-ink">{fileError}</p>
          ) : fileSet === null ? (
            <p className="px-1.5 py-[1px] text-[11px] leading-4 text-ink-dim">Loading…</p>
          ) : (
            <ChangedFileTree
              files={fileSet.files}
              selected={path}
              onSelect={(filename) => {
                setPath(filename);
                diffPanes.current?.scrollToFile(filename);
              }}
            />
          )}
        </ResizableColumn>
        {fileError !== null ? (
          <p className="flex-1 px-2 py-1 text-[11px] text-error-ink">{fileError}</p>
        ) : (
          <DiffPanes ref={diffPanes} owner={owner} repo={repo} fileSet={fileSet} />
        )}
      </div>
    </div>
  );
}
