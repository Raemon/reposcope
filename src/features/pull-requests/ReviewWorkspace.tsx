'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CentralTabBar, useShowsColumn } from './centralLayout';
import { ColumnPreview } from './ColumnPreview';
import { DiffPanes, type DiffPanesHandle } from './DiffPanes';
import { PullCommitColumn, WHOLE_CHANGE, commitItems, commitTokens } from './PullCommitColumn';
import { PullFilesColumn, fileTokens } from './PullFilesColumn';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import { useRegisterColumn } from './columnNav';
import { commentCountsOf, sortChangedFiles } from './diffSort';
import { useDiffSort } from './diffSortStore';
import { commitFilesPath } from './pullPaths';
import type { ChangedFileSet, ChangeSummary, PullRequestSummary } from './pullRequests';
import { ReviewThreadProvider, useReviewTarget } from './reviewThreadStore';
import { useStickyColumn } from './stickyColumns';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { usePollWhileVisible } from '@/features/sources/usePollWhileVisible';

interface ReviewWorkspaceProps {
  owner: string;
  repo: string;
  number: number | null;
  subjectKey: string;
  change: ChangeSummary;
  reloadChange: () => Promise<unknown>;
  wholeFilesPath: string;
  listColumn: ReactNode;
  discussion: ReactNode | null;
  editableWhole: PullRequestSummary | null;
}

export function ReviewWorkspace(props: ReviewWorkspaceProps) {
  return (
    <ReviewThreadProvider owner={props.owner} repo={props.repo} number={props.number}>
      <Workspace {...props} />
    </ReviewThreadProvider>
  );
}

function Workspace({
  owner,
  repo,
  subjectKey,
  change,
  reloadChange,
  wholeFilesPath,
  listColumn,
  discussion,
  editableWhole,
}: ReviewWorkspaceProps) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>(WHOLE_CHANGE);
  const [path, setPath] = useState<string | null>(null);
  const [discussionSize, setDiscussionSize] = useStickyColumn('discussion');
  const [fileSize, setFileSize] = useStickyColumn('files');
  const [commitSize, setCommitSize] = useCommitColumnSize(subjectKey, change.commits.length < 2);
  const diffPanes = useRef<DiffPanesHandle>(null);
  const fileRoute = selection === WHOLE_CHANGE ? wholeFilesPath : commitFilesPath(owner, repo, selection);
  const showing = useRef(fileRoute);
  showing.current = fileRoute;
  const fileState = useCachedJson<ChangedFileSet>(fileRoute, token, ready);
  const fileSet = fileState.data;
  const fileError = fileState.error;

  usePollWhileVisible(fileState.reload, ready);

  useEffect(() => {
    setSelection(WHOLE_CHANGE);
    setNotice(null);
  }, [subjectKey]);

  useEffect(() => {
    if (!fileSet) return;
    setPath((held) => (held && fileSet.files.some((file) => file.filename === held) ? held : fileSet.files[0]?.filename ?? null));
  }, [fileSet]);

  const revealFile = useCallback((filename: string) => {
    setPath(filename);
    diffPanes.current?.scrollToFile(filename);
  }, []);
  const sort = useDiffSort();
  const { threads } = useReviewTarget();
  const files = useMemo(
    () => sortChangedFiles(fileSet?.files ?? [], sort, commentCountsOf(threads)),
    [fileSet, sort, threads],
  );
  const fileItems = useMemo(() => files.map((file) => file.filename), [files]);
  const loadedFiles = fileSet === null ? null : files;

  const showsDiff = useShowsColumn('diff');
  const showsDiscussion = useShowsColumn('discussion');
  const showsCommits = useShowsColumn('commits');
  const showsFiles = useShowsColumn('files');
  useRegisterColumn(
    'discussion',
    { ...collapsibleColumn(discussionSize, setDiscussionSize), items: [], selected: null },
    discussion !== null && showsDiscussion,
  );
  useRegisterColumn(
    'commits',
    {
      ...collapsibleColumn(commitSize, setCommitSize),
      items: commitItems(change),
      selected: selection,
      onSelect: setSelection,
    },
    showsCommits,
  );
  useRegisterColumn(
    'files',
    {
      ...collapsibleColumn(fileSize, setFileSize),
      items: fileItems,
      selected: path,
      onSelect: revealFile,
    },
    showsFiles,
  );
  useRegisterColumn(
    'diff',
    {
      items: fileItems,
      selected: path,
      open: true,
      collapsible: false,
      onSelect: revealFile,
      onActivate: (filename) => diffPanes.current?.toggleFile(filename),
    },
    showsDiff,
  );

  async function reloadInPlace() {
    const asked = fileRoute;
    setNotice(null);
    try {
      await Promise.all([reloadChange(), fileState.reload()]);
    } catch (issue: unknown) {
      if (asked === showing.current) setNotice(reloadFailure(issue));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CentralTabBar />
      <div className="flex min-h-0 flex-1 max-md:flex-col max-md:overflow-y-auto">
        {listColumn}
        {discussion !== null && (
          <ResizableColumn navId="discussion" icon="❝" title="discussion" size={discussionSize} onSize={setDiscussionSize}>
            {discussion}
          </ResizableColumn>
        )}
        <ResizableColumn
          navId="commits"
          icon="◆"
          title="commits"
          preview={<ColumnPreview column="commits" tokens={commitTokens(change, selection)} />}
          size={commitSize}
          onSize={setCommitSize}
        >
          <PullCommitColumn change={change} selection={selection} onSelect={setSelection} />
        </ResizableColumn>
        <ResizableColumn
          navId="files"
          icon="▤"
          title="files"
          preview={<ColumnPreview column="files" tokens={fileTokens(files, path)} />}
          size={fileSize}
          onSize={setFileSize}
        >
          <PullFilesColumn files={loadedFiles} fileError={fileError} path={path} onSelect={revealFile} />
        </ResizableColumn>
        {!showsDiff ? null : fileSet === null && fileError !== null ? (
          <p className="flex-1 px-2 py-1 text-[11px] text-error-ink">{fileError}</p>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col max-md:h-[80vh] max-md:flex-none">
            {notice !== null && <p className="shrink-0 px-2 py-1 text-[11px] text-error-ink">{notice}</p>}
            <DiffPanes
              ref={diffPanes}
              owner={owner}
              repo={repo}
              fileSet={fileSet}
              files={files}
              selected={path}
              editablePull={selection === WHOLE_CHANGE ? editableWhole : null}
              onCommitted={reloadInPlace}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function useCommitColumnSize(subjectKey: string, single: boolean): [ColumnSize, Dispatch<SetStateAction<ColumnSize>>] {
  const [stored, setStored] = useStickyColumn('commits');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const size = single ? { ...stored, open: expandedSubject === subjectKey } : stored;
  const setSize = useCallback<Dispatch<SetStateAction<ColumnSize>>>(
    (next) => {
      const asked = typeof next === 'function' ? next(size) : next;
      if (single) setExpandedSubject(asked.open ? subjectKey : null);
      setStored({ ...asked, open: single ? stored.open : asked.open });
    },
    [single, subjectKey, size, stored.open, setStored],
  );
  return [size, setSize];
}

function collapsibleColumn(size: ColumnSize, onSize: (next: (held: ColumnSize) => ColumnSize) => void) {
  return { open: size.open, collapsible: true, setOpen: (open: boolean) => onSize((held) => ({ ...held, open })) };
}

function reloadFailure(issue: unknown): string {
  return `Commit saved; reloading the diff failed: ${issue instanceof Error ? issue.message : String(issue)}`;
}
