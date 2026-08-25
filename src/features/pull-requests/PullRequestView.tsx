'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ColumnPreview } from './ColumnPreview';
import { DiffPanes, type DiffPanesHandle } from './DiffPanes';
import { PullCommitColumn, commitItems, commitTokens } from './PullCommitColumn';
import { PullDiscussion } from './PullDiscussion';
import { PullFilesColumn, fileTokens, orderedFiles } from './PullFilesColumn';
import { AllPullsColumn, RepoPullsColumn } from './PullListColumn';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import { useRegisterColumn } from './columnNav';
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
  const [listSize, setListSize] = useStickyColumn(acrossRepos ? 'all-pulls' : 'pulls');
  const [discussionSize, setDiscussionSize] = useStickyColumn('discussion');
  const [fileSize, setFileSize] = useStickyColumn('files');
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
  const commitsOpenByDefault = pull ? pull.commits.length > 1 : undefined;
  const [commitSize, setCommitSize] = useStickyColumn('commits', commitsOpenByDefault);

  usePollWhileVisible(() => Promise.all([pullState.reload(), fileState.reload()]), ready);

  useEffect(() => () => setCurrentPull(null), []);

  useEffect(() => {
    setSelection(WHOLE_PULL);
    setNotice(null);
  }, [owner, repo, number]);

  useEffect(() => {
    setCurrentPull(pull && { owner, repo, pull });
  }, [pull, owner, repo]);

  useEffect(() => {
    if (!fileSet) return;
    setPath((held) => (held && fileSet.files.some((file) => file.filename === held) ? held : fileSet.files[0]?.filename ?? null));
  }, [fileSet]);

  const revealFile = useCallback((filename: string) => {
    setPath(filename);
    diffPanes.current?.scrollToFile(filename);
  }, []);
  const fileItems = useMemo(() => orderedFiles(fileSet).map((file) => file.filename), [fileSet]);

  useRegisterColumn('discussion', {
    ...collapsibleColumn(discussionSize, setDiscussionSize),
    items: [],
    selected: null,
  });
  useRegisterColumn('commits', {
    ...collapsibleColumn(commitSize, setCommitSize),
    items: pull ? commitItems(pull) : [],
    selected: selection,
    onSelect: setSelection,
  });
  useRegisterColumn('files', {
    ...collapsibleColumn(fileSize, setFileSize),
    items: fileItems,
    selected: path,
    onSelect: revealFile,
  });
  useRegisterColumn('diff', {
    items: fileItems,
    selected: path,
    open: true,
    collapsible: false,
    onSelect: revealFile,
    onActivate: (filename) => diffPanes.current?.toggleFile(filename),
  });

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
          <AllPullsColumn size={listSize} onSize={setListSize} />
        ) : (
          <RepoPullsColumn owner={owner} repo={repo} size={listSize} onSize={setListSize} />
        )}
        <ResizableColumn navId="discussion" icon="❝" title="discussion" size={discussionSize} onSize={setDiscussionSize}>
          <PullDiscussion owner={owner} repo={repo} number={number} author={pull.pull.author} body={pull.body} />
        </ResizableColumn>
        <ResizableColumn
          navId="commits"
          icon="◆"
          title="commits"
          preview={<ColumnPreview column="commits" tokens={commitTokens(pull, selection)} />}
          size={commitSize}
          onSize={setCommitSize}
        >
          <PullCommitColumn pull={pull} selection={selection} onSelect={setSelection} />
        </ResizableColumn>
        <ResizableColumn
          navId="files"
          icon="▤"
          title="files"
          preview={<ColumnPreview column="files" tokens={fileTokens(fileSet, path)} />}
          size={fileSize}
          onSize={setFileSize}
        >
          <PullFilesColumn
            fileSet={fileSet}
            fileError={fileError}
            path={path}
            onSelect={revealFile}
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
              number={number}
              fileSet={fileSet}
              selected={path}
              editablePull={editablePull(pull.pull, selection)}
              onCommitted={reloadInPlace}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function collapsibleColumn(size: ColumnSize, onSize: (next: (held: ColumnSize) => ColumnSize) => void) {
  return { open: size.open, collapsible: true, setOpen: (open: boolean) => onSize((held) => ({ ...held, open })) };
}

function editablePull(pull: PullRequestSummary, selection: string): PullRequestSummary | null {
  const open = pull.state === 'open' && !pull.merged;
  return selection === WHOLE_PULL && open ? pull : null;
}

function reloadFailure(issue: unknown): string {
  return `Commit saved; reloading the diff failed: ${issue instanceof Error ? issue.message : String(issue)}`;
}
