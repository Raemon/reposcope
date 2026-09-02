'use client';

import { useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { CodeBlockEditor } from './CodeBlockEditor';
import { CommitEditModal } from './CommitEditModal';
import { DiffSide, type HunkControl } from './DiffSide';
import { useDiffLayout } from './diffLayoutStore';
import { columnLines, resultLines, unifiedLines, visibleLines, type DiffLine } from './diffLines';
import { langForPath } from './diffHighlight';
import { linesHeight, ROW_HEIGHT, SAVE_BAR, type RowHeights } from './diffMetrics';
import { useDiffWrap } from './diffWrapStore';
import { useCodeCharWidth, useWrapColumns, wrappedRowHeights, type WrapColumns } from './wrapHeights';
import { useElementWidth } from './useElementWidth';
import { EditTarget } from './editTarget';
import { type EditableBlock } from './editableBlocks';
import { expandDiff } from './expandDiff';
import { useFoldCommand, wholeFileFor, wholeFileWanted, type FoldMode } from './foldModeStore';
import { InlineThreads } from './InlineThreads';
import { setDiffPaneWidth, useDiffPaneWidth } from './diffPaneWidth';
import { DragHandle, useDragWidth } from './ResizableColumn';
import { rowOf } from './commentAnchors';
import { useFileThreads } from './reviewThreadStore';
import { splitDiff, type DiffRow } from './splitDiff';
import { useCodeCollapse, type CollapseAnchor } from './useCodeCollapse';
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
  const layout = useDiffLayout();
  const singleColumn = layout !== 'split' || entireFile;
  const removedSize = { width: useDiffPaneWidth(), open: true };
  const startDrag = useDragWidth(removedSize, setDiffPaneWidth);
  const diffArea = useRef<HTMLDivElement | null>(null);
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
  const commentedRows = useMemo(() => new Set(threads.map((thread) => rowOf(thread, rows))), [threads, rows]);
  const lines = useMemo(() => foldedLines(rows, collapse.hidden, commentedRows), [rows, collapse.hidden, commentedRows]);
  const columns = useDiffWrapColumns(diffArea, singleColumn, removedSize.width);
  const rowHeights = useWrappedRowHeights(rows, columns, collapse.anchors, !singleColumn);
  const resultView = layout === 'result' && !entireFile && anyLineSurvives(rows);
  const oneColumnLines = resultView ? lines.result : lines.unified;
  const mainLines = singleColumn ? oneColumnLines : lines.right;
  const growing = useHeightTransition(rows, collapse.hidden, rowHeights);
  const expand = expandControl(wholeFile, showingWholeFile, hunkEdit, setWantWholeFile);
  const onCodePress = useDefinitionClick(file, baseRef, headRef);
  const shared = { rows, tokens, emphasis, expand, anchors: collapse.anchors, onCodePress, heights: rowHeights };
  const bounds = { hidden: collapse.hidden, stopAtBlankLines: showingWholeFile };
  const editing = {
    editable: pull !== null,
    onEditBlock: (rowIndex: number) => hunkEdit.begin(rowIndex, bounds),
    editedRows: editBlock,
    editor: hunkEditor(file.filename, hunkEdit, mainLines, rowHeights),
  };
  return (
    <div ref={growing} className="flex" style={{ paddingBottom: threadOverflow }}>
      <div ref={diffArea} className="min-w-0 flex-1" style={{ flexBasis: singleColumn ? 0 : removedSize.width * 2 }}>
        {singleColumn ? (
          <DiffSide {...shared} lines={mainLines} labels {...editing} />
        ) : (
          <div className="flex">
            <section className="relative flex shrink-0 flex-col border-r border-panel-edge" style={{ width: removedSize.width }}>
              <DiffSide {...shared} lines={lines.left} labels spacer={spacerFor(hunkEdit.edit, lines.right, rowHeights)} />
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
        lines={mainLines}
        heights={rowHeights}
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

function useDiffWrapColumns(
  diffArea: RefObject<HTMLDivElement | null>,
  singleColumn: boolean,
  leftWidth: number,
): WrapColumns | null {
  const areaWidth = useElementWidth(diffArea);
  const wrapping = useDiffWrap();
  return useWrapColumns(wrapping ? areaWidth : 0, singleColumn ? 0 : leftWidth, useCodeCharWidth());
}

// Collapsed rows draw one truncated line, so their full text must not size them.
function useWrappedRowHeights(
  rows: DiffRow[],
  columns: WrapColumns | null,
  anchors: Map<number, CollapseAnchor>,
  splitPanes: boolean,
): RowHeights {
  const collapsed = useMemo(() => collapsedRows(anchors), [anchors]);
  return useMemo(() => wrappedRowHeights(rows, columns, collapsed, splitPanes), [rows, columns, collapsed, splitPanes]);
}

function collapsedRows(anchors: Map<number, CollapseAnchor>): Set<number> {
  return new Set([...anchors].filter(([, anchor]) => anchor.collapsed).map(([row]) => row));
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

// A wholly deleted file has no surviving lines, so its result view falls back to the diff.
function anyLineSurvives(rows: DiffRow[]): boolean {
  return rows.some((row) => row.right !== null);
}

function foldedLines(rows: DiffRow[], hidden: Set<number>, commentedRows: Set<number>) {
  return {
    left: visibleLines(columnLines(rows, 'left'), hidden),
    right: visibleLines(columnLines(rows, 'right'), hidden),
    unified: visibleLines(unifiedLines(rows), hidden),
    result: visibleLines(resultLines(rows, commentedRows), hidden),
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

function hunkEditor(filename: string, hunkEdit: HunkEditControls, shown: DiffLine[], heights: RowHeights) {
  const edit = hunkEdit.edit;
  if (!edit) return null;
  return (
    <CodeBlockEditor
      key={edit.block.firstRow}
      value={edit.draft}
      lang={langForPath(filename)}
      caretLine={edit.block.caretLine}
      minHeight={coveredHeight(shown, edit.block, heights)}
      saving={hunkEdit.committing}
      onChange={hunkEdit.setDraft}
      onSave={hunkEdit.askToCommit}
      onExit={hunkEdit.askToCommit}
    />
  );
}

// Rendered lines, not rows: a unified change row draws its before and after line.
function coveredHeight(shown: DiffLine[], block: EditableBlock, heights: RowHeights): number {
  return linesHeight(shown.filter((line) => line.row >= block.firstRow && line.row <= block.lastRow), heights);
}

function spacerFor(edit: HunkEdit | null, shown: DiffLine[], heights: RowHeights): { afterRow: number; height: number } | null {
  if (!edit) return null;
  const covered = coveredHeight(shown, edit.block, heights);
  const drawn = Math.max(covered, edit.draft.split('\n').length * ROW_HEIGHT + SAVE_BAR);
  return { afterRow: edit.block.lastRow, height: drawn - covered };
}
