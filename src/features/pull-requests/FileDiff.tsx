'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CodeBlockEditor } from './CodeBlockEditor';
import { CommitEditModal } from './CommitEditModal';
import { DiffSide, type HunkControl } from './DiffSide';
import { useDiffLayout } from './diffLayoutStore';
import { columnLines, unifiedLines, visibleLines, type DiffLine } from './diffLines';
import { langForPath } from './diffHighlight';
import { linesHeight, ROW_HEIGHT, SAVE_BAR } from './diffMetrics';
import { EditTarget } from './editTarget';
import { type EditableBlock } from './editableBlocks';
import { expandDiff } from './expandDiff';
import { useFoldCommand, wholeFileFor, wholeFileWanted, type FoldMode } from './foldModeStore';
import { InlineThreads } from './InlineThreads';
import { setDiffPaneWidth, splitDiffBasis, useDiffPaneWidth } from './diffPaneWidth';
import { DragHandle, useDragWidth } from './ResizableColumn';
import { useFileThreads } from './reviewThreadStore';
import { splitDiff, type DiffRow } from './splitDiff';
import { useCodeCollapse } from './useCodeCollapse';
import { useDefinitionClick } from './useDefinitionClick';
import { useDiffTokens, useIntralineEmphasis } from './useDiffSideHighlight';
import { useHeightTransition } from './useHeightTransition';
import { useHunkEdit, type HunkEdit, type HunkEditControls } from './useHunkEdit';
import { hunkHint, useWholeFile, type WholeFile } from './useWholeFile';
import type { ChangedFile } from './pullRequests';
import { WHOLE_FILE_STATUS } from './wholeFileEntry';
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
  const entireFile = file.status === WHOLE_FILE_STATUS;
  const unified = useDiffLayout() === 'unified' || entireFile;
  const removedSize = { width: useDiffPaneWidth(), open: true };
  const startDrag = useDragWidth(removedSize, setDiffPaneWidth);
  const [wantWholeFile, setWantWholeFile] = useState(wholeFileWanted);
  const [threadOverflow, setThreadOverflow] = useState(0);
  const wholeFile = useWholeFile(owner, repo, file, baseRef, headRef, wantWholeFile);
  const patchRows = useMemo(() => splitDiff(file.patch ?? ''), [file.patch]);
  const rows = useMemo(() => rowsForDisplay(patchRows, wholeFile.lines, entireFile), [patchRows, wholeFile.lines, entireFile]);
  const showingWholeFile = rows !== patchRows;
  const emphasis = useIntralineEmphasis(rows);
  const tokens = useDiffTokens(rows, file.filename);
  const pull = target?.pull ?? null;
  const hunkEdit = useHunkEdit({
    owner,
    repo,
    pull,
    headRef: target?.headRef ?? '',
    rows,
    filename: file.filename,
    token,
    onCommitted: target?.onCommitted,
  });
  useFoldCommandWholeFile(hunkEdit, setWantWholeFile);
  const editBlock = hunkEdit.edit?.block ?? null;
  const threads = useFileThreads(file.filename);
  const collapse = useCodeCollapse(rows, showingWholeFile, file.filename, threads, editBlock);
  const lines = useMemo(() => foldedLines(rows, collapse.hidden), [rows, collapse.hidden]);
  const growing = useHeightTransition(rows, collapse.hidden);
  const expand = expandControl(wholeFile, showingWholeFile, hunkEdit, setWantWholeFile);
  const onCodePress = useDefinitionClick(file, baseRef, headRef);
  const shared = { rows, tokens, emphasis, expand, anchors: collapse.anchors, onCodePress };
  const bounds = { hidden: collapse.hidden, stopAtBlankLines: showingWholeFile };
  const editing = {
    editable: pull !== null,
    onEditBlock: (rowIndex: number) => hunkEdit.begin(rowIndex, bounds),
    editedRows: editBlock,
    editor: hunkEditor(file.filename, hunkEdit, unified ? lines.unified : lines.right),
  };
  return (
    <div ref={growing} className="flex" style={{ paddingBottom: threadOverflow }}>
      <div className="min-w-0 flex-1" style={{ flexBasis: unified ? 0 : splitDiffBasis(removedSize.width) }}>
        {unified ? (
          <DiffSide {...shared} lines={lines.unified} labels {...editing} />
        ) : (
          <div className="flex">
            <section className="relative flex shrink-0 flex-col border-r border-panel-edge" style={{ width: removedSize.width }}>
              <DiffSide {...shared} lines={lines.left} labels spacer={spacerFor(hunkEdit.edit, lines.right)} />
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
      {hunkEdit.message !== null && hunkEdit.edit !== null && (
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

function useFoldCommandWholeFile(hunkEdit: HunkEditControls, setWantWholeFile: (next: boolean) => void) {
  const command = useFoldCommand();
  const applied = useRef(command.epoch);
  const apply = useRef<(mode: FoldMode) => void>(() => {});
  apply.current = (mode) => {
    const want = wholeFileFor(mode);
    if (want !== null && leaveEdit(hunkEdit)) setWantWholeFile(want);
  };
  useEffect(() => {
    if (applied.current === command.epoch) return;
    applied.current = command.epoch;
    apply.current(command.mode);
  }, [command]);
}

function rowsForDisplay(patchRows: DiffRow[], lines: WholeFile['lines'], entireFile: boolean): DiffRow[] {
  if (lines) return expandDiff(patchRows, lines.base, lines.head);
  return entireFile ? patchRows.filter((row) => row.kind !== 'hunk') : patchRows;
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
  hunkEdit: HunkEditControls,
  setWantWholeFile: (update: (was: boolean) => boolean) => void,
): HunkControl {
  return {
    expanded: showingWholeFile,
    hint: hunkHint(wholeFile, showingWholeFile),
    onToggle: wholeFile.available ? () => toggleWholeFile(hunkEdit, setWantWholeFile) : null,
  };
}

function toggleWholeFile(hunkEdit: HunkEditControls, setWantWholeFile: (update: (was: boolean) => boolean) => void) {
  if (leaveEdit(hunkEdit)) setWantWholeFile((was) => !was);
}

function leaveEdit(hunkEdit: HunkEditControls): boolean {
  if (hunkEdit.edit && hunkEdit.edit.draft !== hunkEdit.edit.block.text) return false;
  hunkEdit.close();
  return true;
}

function hunkEditor(filename: string, hunkEdit: HunkEditControls, shown: DiffLine[]) {
  const edit = hunkEdit.edit;
  if (!edit) return null;
  return (
    <CodeBlockEditor
      key={edit.block.firstRow}
      value={edit.draft}
      lang={langForPath(filename)}
      caretLine={edit.block.caretLine}
      minHeight={coveredHeight(shown, edit.block)}
      saving={hunkEdit.committing}
      onChange={hunkEdit.setDraft}
      onSave={hunkEdit.askToCommit}
      onExit={hunkEdit.askToCommit}
    />
  );
}

// Rendered lines, not rows: a unified change row draws its before and after line.
function coveredHeight(shown: DiffLine[], block: EditableBlock): number {
  return linesHeight(shown.filter((line) => line.row >= block.firstRow && line.row <= block.lastRow));
}

function spacerFor(edit: HunkEdit | null, shown: DiffLine[]): { afterRow: number; height: number } | null {
  if (!edit) return null;
  const covered = coveredHeight(shown, edit.block);
  const drawn = Math.max(covered, edit.draft.split('\n').length * ROW_HEIGHT + SAVE_BAR);
  return { afterRow: edit.block.lastRow, height: drawn - covered };
}
