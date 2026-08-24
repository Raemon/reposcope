'use client';

import { useEffect, useRef, useState } from 'react';
import { ChangeCounts } from './ChangeCounts';
import { ChangedFileTree } from './ChangedFileTree';
import { ColumnPreview, type PreviewToken } from './ColumnPreview';
import { DiffPanes, type DiffPanesHandle } from './DiffPanes';
import { PullDiscussion } from './PullDiscussion';
import { AllPullsColumn, RepoPullsColumn } from './PullListColumn';
import { ResizableColumn } from './ResizableColumn';
import { setCurrentPull } from './currentPullStore';
import { commitFilesPath, pullFilesPath, pullPath } from './pullPaths';
import type { ChangedFile, ChangedFileSet, CommitSummary, PullRequestCommits } from './pullRequests';
import { useStickyColumn } from './stickyColumns';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

const ROW = 'flex w-full items-baseline gap-1.5 px-1.5 py-[1px] text-left text-[11px] leading-4';
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
  const { data: pull, error } = useCachedJson<PullRequestCommits>(pullPath(owner, repo, number), token, ready);
  const { data: fileSet, error: fileError } = useCachedJson<ChangedFileSet>(
    selection === WHOLE_PULL ? pullFilesPath(owner, repo, number) : commitFilesPath(owner, repo, selection),
    token,
    ready,
  );

  useEffect(() => () => setCurrentPull(null), []);

  useEffect(() => {
    setCurrentPull(pull);
    if (pull) setCommitSize((size) => ({ ...size, open: pull.commits.length > 1 }));
  }, [pull, setCommitSize]);

  useEffect(() => {
    if (!fileSet) return;
    setPath((held) => (held && fileSet.files.some((file) => file.filename === held) ? held : fileSet.files[0]?.filename ?? null));
  }, [fileSet]);

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
          title="commit"
          count={pull.commits.length}
          preview={<ColumnPreview tokens={pull.commits.map((commit) => commitToken(commit, selection))} />}
          size={commitSize}
          onSize={setCommitSize}
        >
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
              <span className="shrink-0 text-[9px] text-ink-dim">{commit.fileCount}f</span>
              <ChangeCounts additions={commit.additions} deletions={commit.deletions} />
              <RelativeTime iso={commit.date} className="shrink-0 text-[9px] text-ink-dim" />
            </SelectableRow>
          ))}
        </ResizableColumn>
        <ResizableColumn
          icon="▤"
          title="file"
          count={fileSet?.files.length}
          preview={<ColumnPreview tokens={(fileSet?.files ?? []).map((file) => fileToken(file, path))} />}
          size={fileSize}
          onSize={setFileSize}
        >
          {fileSet === null ? (
            <p className={`px-1.5 py-[1px] text-[11px] leading-4 ${fileError ? 'text-error-ink' : 'text-ink-dim'}`}>
              {fileError ?? 'Loading…'}
            </p>
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
        {fileSet === null && fileError !== null ? (
          <p className="flex-1 px-2 py-1 text-[11px] text-error-ink">{fileError}</p>
        ) : (
          <DiffPanes ref={diffPanes} owner={owner} repo={repo} fileSet={fileSet} />
        )}
      </div>
    </div>
  );
}

function commitToken(commit: CommitSummary, selection: string): PreviewToken {
  return {
    key: commit.sha,
    label: commit.sha.slice(0, 2),
    title: `${commit.sha.slice(0, 7)} · ${commit.message}`,
    accent: commit.sha === selection,
  };
}

function fileToken(file: ChangedFile, selected: string | null): PreviewToken {
  const name = file.filename.split('/').pop() ?? file.filename;
  return {
    key: file.filename,
    label: name.slice(0, 2),
    title: file.filename,
    accent: file.filename === selected,
  };
}
