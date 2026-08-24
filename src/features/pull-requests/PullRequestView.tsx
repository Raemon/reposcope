'use client';

import { useEffect, useRef, useState } from 'react';
import { ColumnPreview } from './ColumnPreview';
import { DiffPanes, type DiffPanesHandle } from './DiffPanes';
import { PullCommitColumn, commitTokens } from './PullCommitColumn';
import { PullDiscussion } from './PullDiscussion';
import { PullFilesColumn, fileTokens } from './PullFilesColumn';
import { AllPullsColumn, RepoPullsColumn } from './PullListColumn';
import { ResizableColumn } from './ResizableColumn';
import { setCurrentPull } from './currentPullStore';
import { commitFilesPath, pullFilesPath, pullPath } from './pullPaths';
import type { ChangedFileSet, PullRequestCommits, PullRequestSummary } from './pullRequests';
import { useStickyColumn } from './stickyColumns';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { usePollWhileVisible } from '@/features/sources/usePollWhileVisible';

const WHOLE_PULL = 'all';

export function PullRequestView({
  owner,
  repo,
  number,
  acrossRepos = false,
}: {
  owner: string;
  repo: string;
  number: number;
  acrossRepos?: boolean;
}) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>(WHOLE_PULL);
  const [path, setPath] = useState<string | null>(null);
  const [listSize, setListSize] = useStickyColumn(acrossRepos ? 'all-pulls' : 'pulls', {
    width: acrossRepos ? 380 : 300,
    open: acrossRepos,
  });
  const [discussionSize, setDiscussionSize] = useStickyColumn('discussion', { width: 320, open: false });
  const [commitSize, setCommitSize] = useStickyColumn('commits', { width: 260, open: true });
  const [fileSize, setFileSize] = useStickyColumn('files', { width: 280, open: true });
  const diffPanes = useRef<DiffPanesHandle>(null);
  const pullRoute = pullPath(owner, repo, number);
  const fileRoute = selection === WHOLE_PULL ? pullFilesPath(owner, repo, number) : commitFilesPath(owner, repo, selection);
  const showing = useRef(fileRoute);
  showing.current = fileRoute;
  const pullState = useCachedJson<PullRequestCommits>(pullRoute, token, ready);
  const fileState = useCachedJson<ChangedFileSet>(fileRoute, token, ready);
  const pull = pullState.data;
  const error = pullState.error;
  const fileSet = fileState.data;
  const fileError = fileState.error;

  usePollWhileVisible(() => Promise.all([pullState.reload(), fileState.reload()]), ready);

  useEffect(() => () => setCurrentPull(null), []);

  useEffect(() => {
    setSelection(WHOLE_PULL);
    setNotice(null);
  }, [owner, repo, number]);

  useEffect(() => {
    setCurrentPull(pull && { owner, repo, pull });
    if (pull) setCommitSize((size) => ({ ...size, open: pull.commits.length > 1 }));
  }, [pull, owner, repo, setCommitSize]);

  useEffect(() => {
    if (!fileSet) return;
    setPath((held) => (held && fileSet.files.some((file) => file.filename === held) ? held : fileSet.files[0]?.filename ?? null));
  }, [fileSet]);

  async function reloadInPlace() {
    const asked = fileRoute;
    try {
      setNotice(null);
      await Promise.all([pullState.reload(), fileState.reload()]);
      if (asked !== showing.current) return;
    } catch (issue: unknown) {
      if (asked !== showing.current) return;
      setNotice(reloadFailure(issue));
    }
  }

  if (!pull) {
    if (error) return <p className="px-2 py-1 text-[11px] text-error-ink">{error}</p>;
    return <p className="px-2 py-1 text-[11px] text-ink-dim">Loading #{number}…</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        {acrossRepos ? (
          <AllPullsColumn owner={owner} repo={repo} number={number} size={listSize} onSize={setListSize} />
        ) : (
          <RepoPullsColumn owner={owner} repo={repo} number={number} size={listSize} onSize={setListSize} />
        )}
        <ResizableColumn icon="❝" title="discussion" size={discussionSize} onSize={setDiscussionSize}>
          <PullDiscussion owner={owner} repo={repo} number={number} author={pull.pull.author} body={pull.body} />
        </ResizableColumn>
        <ResizableColumn
          icon="◆"
          title="commits"
          preview={<ColumnPreview tokens={commitTokens(pull, selection)} />}
          size={commitSize}
          onSize={setCommitSize}
        >
          <PullCommitColumn pull={pull} selection={selection} onSelect={setSelection} />
        </ResizableColumn>
        <ResizableColumn
          icon="▤"
          title="files"
          preview={<ColumnPreview tokens={fileTokens(fileSet, path)} />}
          size={fileSize}
          onSize={setFileSize}
        >
          <PullFilesColumn
            fileSet={fileSet}
            fileError={fileError}
            path={path}
            onSelect={(filename) => {
              setPath(filename);
              diffPanes.current?.scrollToFile(filename);
            }}
          />
        </ResizableColumn>
        {fileSet === null && fileError !== null ? (
          <p className="flex-1 px-2 py-1 text-[11px] text-error-ink">{fileError}</p>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            {notice !== null && <p className="shrink-0 px-2 py-1 text-[11px] text-error-ink">{notice}</p>}
            <DiffPanes
              ref={diffPanes}
              owner={owner}
              repo={repo}
              fileSet={fileSet}
              editablePull={editablePull(pull.pull, selection)}
              onCommitted={reloadInPlace}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function editablePull(pull: PullRequestSummary, selection: string): PullRequestSummary | null {
  const open = pull.state === 'open' && !pull.merged;
  return selection === WHOLE_PULL && open ? pull : null;
}

function reloadFailure(issue: unknown): string {
  return `Commit saved; reloading the diff failed: ${issue instanceof Error ? issue.message : String(issue)}`;
}
