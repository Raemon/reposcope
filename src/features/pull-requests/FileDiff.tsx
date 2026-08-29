'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CodeBlockEditor } from './CodeBlockEditor';
import { CommitEditModal } from './CommitEditModal';
import { DiffSide, type HunkControl } from './DiffSide';
import { useDiffLayout } from './diffLayoutStore';
import { columnLines, unifiedLines, visibleLines } from './diffLines';
import { langForPath } from './diffHighlight';
import { ROW_HEIGHT, SAVE_BAR } from './diffMetrics';
import { EditTarget } from './editTarget';
import { type EditableBlock } from './editableBlocks';
import { expandDiff } from './expandDiff';
import { useFoldCommand, type FoldMode } from './foldModeStore';
import { InlineThreads } from './InlineThreads';
import { setDiffPaneWidth, useDiffPaneWidth } from './diffPaneWidth';
import { DragHandle, useDragWidth } from './ResizableColumn';
import { useFileThreads } from './reviewThreadStore';
import { splitDiff, type DiffRow } from './splitDiff';
import { useCodeCollapse } from './useCodeCollapse';
import { useDiffTokens, useIntralineEmphasis } from './useDiffSideHighlight';
import { useHeightTransition } from './useHeightTransition';
import { useHunkEdit, type HunkEdit } from './useHunkEdit';
import { hunkHint, useWholeFile, type WholeFile } from './useWholeFile';
import type { ChangedFile } from './pullRequests';
import { useGithubToken } from '@/features/sources/sourceStore';

export function FileDiff({
  owner,
  repo,
  file,
  baseRef,
  headRef,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
}) {
  const token = useGithubToken();
  const target = useContext(EditTarget);
  const unified = useDiffLayout() === 'unified';
  const removedSize = { width: useDiffPaneWidth(), open: true };
  const startDrag = useDragWidth(removedSize, setDiffPaneWidth);
  const [wantWholeFile, setWantWholeFile] = useState(false);
  const [threadOverflow, setThreadOverflow] = useState(0);
  const wholeFile = useWholeFile(owner, repo, file, baseRef, headRef, wantWholeFile);
  const patchRows = useMemo(() => splitDiff(file.patch ?? ''), [file.patch]);
  const rows = useMemo(() => rowsForDisplay(patchRows, wholeFile.lines), [patchRows, wholeFile.lines]);
  const emphasis = useIntralineEmphasis(rows);
  const tokens = useDiffTokens(rows, file.filename);
  const pull = target?.pull ?? null;
  const hunkEdit = useHunkEdit({
    owner,
    repo,
    pull,
    headRef: target?.headRef ?? '',
    rows: patchRows,
    filename: file.filename,
    patch: file.patch ?? '',
    token,
    onCommitted: target?.onCommitted,
  });
  useFoldCommandWholeFile(hunkEdit, setWantWholeFile);
  const showingWholeFile = rows !== patchRows;
  const canEdit = pull !== null && !wantWholeFile;
  const editBlock = canEdit ? hunkEdit.edit?.block ?? null : null;
  const threads = useFileThreads(file.filename);
  const collapse = useCodeCollapse(rows, showingWholeFile, file.filename, threads, editBlock);
  const lines = useMemo(() => foldedLines(rows, collapse.hidden), [rows, collapse.hidden]);
  const growing = useHeightTransition(rows, collapse.hidden);
  const expand = expandControl(wholeFile, showingWholeFile, hunkEdit, setWantWholeFile);
  const shared = { rows, tokens, emphasis, expand, anchors: collapse.anchors };
  const editing = {
    editable: canEdit,
    onEditBlock: hunkEdit.begin,
    editedRows: editBlock,
    editor: canEdit && hunkEdit.edit ? hunkEditor(file.filename, hunkEdit) : null,
  };
  return (
    <div ref={growing} className="flex" style={{ paddingBottom: threadOverflow }}>
      <div className="min-w-0 flex-1">
        {unified ? (
          <DiffSide {...shared} lines={lines.unified} labels {...editing} />
        ) : (
          <div className="flex">
            <section className="relative flex shrink-0 flex-col border-r border-panel-edge" style={{ width: removedSize.width }}>
              <DiffSide {...shared} lines={lines.left} labels spacer={canEdit ? spacerFor(hunkEdit.edit) : null} />
              <DragHandle onPointerDown={startDrag} />
            </section>
            <section className="flex min-w-0 flex-1 flex-col">
              <DiffSide {...shared} lines={lines.right} labels={false} {...editing} />
            </section>
          </div>
        )}
      </div>
      <InlineThreads
        threads={threads}
        rows={rows}
        lines={unified ? lines.unified : lines.right}
        onOverflow={setThreadOverflow}
      />
      {canEdit && hunkEdit.message !== null && hunkEdit.edit !== null && (
        <CommitEditModal
          path={file.filename}
          message={hunkEdit.message}
          committing={hunkEdit.committing}
          error={hunkEdit.failure}
          onMessage={hunkEdit.setMessage}
          onCommit={hunkEdit.commit}
          onRevert={hunkEdit.close}
          onCancel={hunkEdit.dismissModal}
        />
      )}
    </div>
  );
}

function useFoldCommandWholeFile(hunkEdit: ReturnType<typeof useHunkEdit>, setWantWholeFile: (next: boolean) => void) {
  const command = useFoldCommand();
  const apply = useRef<(mode: FoldMode) => void>(() => {});
  apply.current = (mode) => {
    if (mode !== 'collapseUnchanged' && mode !== 'default') return;
    if (hunkEdit.edit && hunkEdit.edit.draft !== hunkEdit.edit.block.text) return;
    hunkEdit.close();
    setWantWholeFile(mode === 'collapseUnchanged');
  };
  useEffect(() => {
    if (command.epoch > 0) apply.current(command.mode);
  }, [command]);
}

function rowsForDisplay(patchRows: DiffRow[], lines: WholeFile['lines']): DiffRow[] {
  return lines ? expandDiff(patchRows, lines.base, lines.head) : patchRows;
}

function foldedLines(rows: DiffRow[], hidden: Set<number>) {
  return {
    left: visibleLines(columnLines(rows, 'left'), hidden),
    right: visibleLines(columnLines(rows, 'right'), hidden),
    unified: visibleLines(unifiedLines(rows), hidden),
  };
}

function expandControl(
  wholeFile: WholeFile,
  showingWholeFile: boolean,
  hunkEdit: ReturnType<typeof useHunkEdit>,
  setWantWholeFile: (update: (was: boolean) => boolean) => void,
): HunkControl {
  return {
    expanded: showingWholeFile,
    hint: hunkHint(wholeFile, showingWholeFile),
    onToggle: wholeFile.available ? () => toggleWholeFile(hunkEdit, setWantWholeFile) : null,
  };
}

function toggleWholeFile(hunkEdit: ReturnType<typeof useHunkEdit>, setWantWholeFile: (update: (was: boolean) => boolean) => void) {
  if (hunkEdit.edit && hunkEdit.edit.draft !== hunkEdit.edit.block.text) return;
  hunkEdit.close();
  setWantWholeFile((was) => !was);
}

function hunkEditor(filename: string, hunkEdit: ReturnType<typeof useHunkEdit>) {
  const edit = hunkEdit.edit;
  if (!edit) return null;
  return (
    <CodeBlockEditor
      key={edit.block.firstRow}
      value={edit.draft}
      lang={langForPath(filename)}
      caretLine={edit.block.caretLine}
      minHeight={coveredHeight(edit.block)}
      saving={hunkEdit.committing}
      onChange={hunkEdit.setDraft}
      onSave={hunkEdit.askToCommit}
      onExit={hunkEdit.askToCommit}
    />
  );
}

function coveredHeight(block: EditableBlock): number {
  return (block.lastRow - block.firstRow + 1) * ROW_HEIGHT;
}

function spacerFor(edit: HunkEdit | null): { afterRow: number; height: number } | null {
  if (!edit) return null;
  const covered = coveredHeight(edit.block);
  const drawn = Math.max(covered, edit.draft.split('\n').length * ROW_HEIGHT + SAVE_BAR);
  return { afterRow: edit.block.lastRow, height: drawn - covered };
}
