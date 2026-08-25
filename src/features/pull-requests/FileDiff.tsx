'use client';

import { useContext, useMemo, useState } from 'react';
import { CodeBlockEditor } from './CodeBlockEditor';
import { CommitEditModal } from './CommitEditModal';
import { DiffSide, type HunkControl } from './DiffSide';
import { useDiffLayout } from './diffLayoutStore';
import { columnLines, unifiedLines } from './diffLines';
import { langForPath } from './diffHighlight';
import { ROW_HEIGHT, SAVE_BAR } from './diffMetrics';
import { EditTarget } from './editTarget';
import { type EditableBlock } from './editableBlocks';
import { expandDiff } from './expandDiff';
import { outlineRows } from './outlineDiff';
import { DragHandle, useDragWidth, type ColumnSize } from './ResizableColumn';
import { splitDiff, type DiffRow } from './splitDiff';
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
  outline = false,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
  outline?: boolean;
}) {
  const token = useGithubToken();
  const target = useContext(EditTarget);
  const unified = useDiffLayout() === 'unified';
  const [removedSize, setRemovedSize] = useState<ColumnSize>({ width: 520, open: true });
  const startDrag = useDragWidth(removedSize, setRemovedSize);
  const [wantWholeFile, setWantWholeFile] = useState(false);
  const wholeFile = useWholeFile(owner, repo, file, baseRef, headRef, wantWholeFile);
  const patchRows = useMemo(() => splitDiff(file.patch ?? ''), [file.patch]);
  const fullRows = useMemo(() => rowsForDisplay(patchRows, wholeFile.lines), [patchRows, wholeFile.lines]);
  const rows = useMemo(() => (outline ? outlineRows(fullRows) : fullRows), [outline, fullRows]);
  const columns = useMemo(() => ({ left: columnLines(rows, 'left'), right: columnLines(rows, 'right') }), [rows]);
  const merged = useMemo(() => unifiedLines(rows), [rows]);
  const emphasis = useIntralineEmphasis(rows);
  const tokens = useDiffTokens(rows, file.filename);
  const growing = useHeightTransition(rows);
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
  const showingWholeFile = fullRows !== patchRows;
  const canEdit = pull !== null && !wantWholeFile && !outline;
  const expand = expandControl(wholeFile, showingWholeFile, hunkEdit, setWantWholeFile);
  const shared = { rows, tokens, emphasis, expand };
  const editing = {
    editable: canEdit,
    onEditBlock: hunkEdit.begin,
    editedRows: canEdit ? hunkEdit.edit?.block ?? null : null,
    editor: canEdit && hunkEdit.edit ? hunkEditor(file.filename, hunkEdit) : null,
  };
  if (outline && rows.length === 0) return <OutlineEmpty />;
  return (
    <div ref={growing}>
      {unified ? (
        <DiffSide {...shared} lines={merged} labels {...editing} />
      ) : (
        <div className="flex">
          <section className="relative flex shrink-0 flex-col border-r border-panel-edge" style={{ width: removedSize.width }}>
            <DiffSide {...shared} lines={columns.left} labels spacer={canEdit ? spacerFor(hunkEdit.edit) : null} />
            <DragHandle onPointerDown={startDrag} />
          </section>
          <section className="flex min-w-0 flex-1 flex-col">
            <DiffSide {...shared} lines={columns.right} labels={false} {...editing} />
          </section>
        </div>
      )}
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

function OutlineEmpty() {
  return <p className="px-2 py-[2px] text-[10px] text-ink-dim">no declarations — expand to see the diff</p>;
}

function rowsForDisplay(patchRows: DiffRow[], lines: WholeFile['lines']): DiffRow[] {
  return lines ? expandDiff(patchRows, lines.base, lines.head) : patchRows;
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
