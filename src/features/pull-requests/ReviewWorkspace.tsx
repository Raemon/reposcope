'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AiChatColumn } from '@/features/ai-chat/AiChatColumn';
import { ColumnBoundary } from '@/features/surface-ui/ColumnBoundary';
import { AllFilesSection } from './AllFilesSection';
import { CentralTabBar, useShowsColumn } from './centralLayout';
import { ColumnPreview } from './ColumnPreview';
import { DiffPanes, type DiffPanesHandle } from './DiffPanes';
import { PullCommitColumn, WHOLE_CHANGE, commitItems, commitTokens } from './PullCommitColumn';
import { PullFilesColumn, fileTokens } from './PullFilesColumn';
import { isTreeItem } from './fileTreeNodes';
import { RepoBrowseReader } from './RepoBrowseReader';
import { useRepoFiles } from './repoFileStore';
import { ResizableColumn, collapsibleColumn, type ColumnSize } from './ResizableColumn';
import { useRegisterColumn } from './columnNav';
import { commentCountsOf, sortChangedFiles } from './diffSort';
import { useDiffSort } from './diffSortStore';
import { DeleteFileModal } from './DeleteFileModal';
import { commitFilesPath } from './pullPaths';
import type { ChangedFile, ChangedFileSet, ChangeSummary, PullRequestSummary } from './pullRequests';
import { ReviewThreadProvider, useReviewTarget } from './reviewThreadStore';
import { useStickyColumn, useStickyOpen } from './stickyColumns';
import { useFileDeletion } from './useFileDeletion';
import { useRepoFileTree } from './useRepoFileTree';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { usePollWhileVisible } from '@/features/sources/usePollWhileVisible';
import { errorMessage } from '@/features/surface-ui/errorMessage';

interface ReviewWorkspaceProps {
  owner: string;
  repo: string;
  number: number | null;
  subjectKey: string;
  change: ChangeSummary;
  baseRef: string | null;
  headRef: string | null;
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
  number,
  subjectKey,
  change,
  baseRef,
  headRef,
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
  const [deleted, setDeleted] = useState<string[]>([]);
  const [browsed, setBrowsed] = useState<string | null>(null);
  const [fileQuery, setFileQuery] = useState('');
  const [scrollWanted, setScrollWanted] = useState<string | null>(null);
  const [allFilesOpen, setAllFilesOpen] = useStickyOpen('all-files');
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

  const repoFiles = useRepoFiles(owner, repo, (fileSize.open && allFilesOpen) || browsed !== null);

  usePollWhileVisible(fileState.reload, ready);

  useEffect(() => {
    setSelection(WHOLE_CHANGE);
    setNotice(null);
    setBrowsed(null);
  }, [subjectKey]);

  const showingWhole = selection === WHOLE_CHANGE;
  useReloadOnRetarget(subjectKey, baseRef, () => (showingWhole ? fileState.reload() : Promise.resolve()));

  useEffect(() => {
    if (scrollWanted === null || browsed !== null) return;
    diffPanes.current?.scrollToFile(scrollWanted);
    setScrollWanted(null);
  }, [scrollWanted, browsed]);

  useEffect(() => {
    if (!fileSet) return;
    if (showingWhole) setDeleted((held) => held.filter((filename) => stillLivingIn(fileSet, filename)));
    setPath((held) => (held && fileSet.files.some((file) => file.filename === held) ? held : fileSet.files[0]?.filename ?? null));
  }, [fileSet, showingWhole]);

  const revealFile = useCallback((filename: string) => {
    setBrowsed(null);
    setPath(filename);
    setScrollWanted(filename);
  }, []);
  const browseTree = useRepoFileTree({
    repoFiles,
    query: fileQuery,
    selected: browsed,
    onSelect: setBrowsed,
  });
  const selectFileItem = useCallback(
    (item: string) => (isTreeItem(item) ? browseTree.selectItem(item) : revealFile(item)),
    [browseTree, revealFile],
  );
  const activateFileItem = useCallback(
    (item: string) => (isTreeItem(item) ? browseTree.activateItem(item) : revealFile(item)),
    [browseTree, revealFile],
  );
  const sort = useDiffSort();
  const { threads } = useReviewTarget();
  const files = useMemo(
    () => sortChangedFiles(remaining(fileSet?.files ?? [], showingWhole ? deleted : []), sort, commentCountsOf(threads)),
    [fileSet, deleted, showingWhole, sort, threads],
  );
  const fileItems = useMemo(() => files.map((file) => file.filename), [files]);
  const browseItems = allFilesOpen ? browseTree.navItems : [];
  const loadedFiles = fileSet === null ? null : files;

  const editableFiles = showingWhole ? editableWhole : null;
  const deletion = useFileDeletion({
    owner,
    repo,
    number,
    headRef: fileSet?.headRef ?? null,
    token,
    onDeleted: (filename) => {
      setDeleted((held) => [...held, filename]);
      setPath((held) => (held === filename ? neighborOf(files, filename) : held));
      return reloadInPlace();
    },
  });

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
      items: [...fileItems, ...browseItems],
      selected: browsed ?? path,
      onSelect: selectFileItem,
      onActivate: activateFileItem,
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
          tone="bg-shade"
          preview={<ColumnPreview column="files" tokens={fileTokens(files, path)} />}
          size={fileSize}
          onSize={setFileSize}
          footer={
            <AllFilesSection
              repoFiles={repoFiles}
              tree={browseTree}
              expanded={allFilesOpen}
              onExpanded={setAllFilesOpen}
              selected={browsed}
              onSelect={setBrowsed}
              query={fileQuery}
              onQuery={setFileQuery}
            />
          }
        >
          <PullFilesColumn
            files={loadedFiles}
            fileError={fileError}
            path={path}
            onSelect={revealFile}
            onDelete={editableFiles !== null && fileSet !== null ? deletion.ask : null}
          />
        </ResizableColumn>
        {!showsDiff ? null : browsed !== null && repoFiles.fileSet !== null ? (
          <div className="flex min-w-0 flex-1 flex-col max-md:h-[80vh] max-md:flex-none">
            <RepoBrowseReader owner={owner} repo={repo} fileSet={repoFiles.fileSet} tree={browseTree} item={browsed} />
          </div>
        ) : fileSet === null && fileError !== null ? (
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
              editablePull={editableFiles}
              onCommitted={reloadInPlace}
            />
          </div>
        )}
        <ColumnBoundary>
          <AiChatColumn owner={owner} repo={repo} subject={subjectKey} headRef={headRef} />
        </ColumnBoundary>
      </div>
      {deletion.asking !== null && (
        <DeleteFileModal
          path={deletion.asking}
          deleting={deletion.deleting}
          error={deletion.failure}
          onConfirm={deletion.confirm}
          onCancel={deletion.cancel}
        />
      )}
    </div>
  );
}

function remaining(files: ChangedFile[], deleted: string[]): ChangedFile[] {
  return deleted.length === 0 ? files : files.filter((file) => !deleted.includes(file.filename));
}

function neighborOf(files: ChangedFile[], filename: string): string | null {
  const rest = files.filter((file) => file.filename !== filename);
  const at = files.findIndex((file) => file.filename === filename);
  return (rest[at] ?? rest[at - 1])?.filename ?? null;
}

// Keeps a deleted row hidden until GitHub agrees, so a racing poll can't flash it back.
function stillLivingIn(fileSet: ChangedFileSet, filename: string): boolean {
  return fileSet.files.some((file) => file.filename === filename && file.status !== 'removed');
}

function useCommitColumnSize(subjectKey: string, single: boolean): [ColumnSize, (next: ColumnSize) => void] {
  const [stored, setStored] = useStickyColumn('commits');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const size = single ? { ...stored, open: expandedSubject === subjectKey } : stored;
  const setSize = (next: ColumnSize) => {
    if (single) setExpandedSubject(next.open ? subjectKey : null);
    setStored(single ? { ...next, open: stored.open } : next);
  };
  return [size, setSize];
}

function useReloadOnRetarget(subjectKey: string, baseRef: string | null, reload: () => Promise<unknown>): void {
  const seen = useRef({ subjectKey, baseRef });
  useEffect(() => {
    const before = seen.current;
    seen.current = { subjectKey, baseRef };
    if (before.subjectKey === subjectKey && before.baseRef !== baseRef) void reload().catch(() => {});
  });
}

function reloadFailure(issue: unknown): string {
  return `Commit saved; reloading the diff failed: ${errorMessage(issue)}`;
}
