'use client';

import { useState } from 'react';
import { ColumnHeader, CollapsedColumn, DragHandle, useColumn, useDragWidth } from './ResizableColumn';
import { splitDiff, type DiffCell, type DiffRow } from './splitDiff';
import type { CommitFile } from './pullRequests';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
const GUTTER = 'w-[38px] shrink-0 select-none pr-1 text-right text-[9px] text-ink-dim';

export function DiffPanes({ file }: { file: CommitFile | null }) {
  const [removedSize, setRemovedSize] = useColumn(520);
  const [addedOpen, setAddedOpen] = useState(true);
  const startDrag = useDragWidth(removedSize, setRemovedSize);

  if (!file) return <Note text="Select a file" />;
  if (!file.patch) return <Note text={`${file.status} — no textual diff`} />;

  const rows = splitDiff(file.patch);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FileBar file={file} />
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        {removedSize.open ? (
          <section
            className="relative flex shrink-0 flex-col border-r border-panel-edge"
            style={{ width: addedOpen ? removedSize.width : undefined, flex: addedOpen ? undefined : '1 1 0%' }}
          >
            <ColumnHeader icon="−" title="removed" onCollapse={() => setRemovedSize({ ...removedSize, open: false })} />
            <DiffSide rows={rows} side="left" />
            {addedOpen && <DragHandle onPointerDown={startDrag} />}
          </section>
        ) : (
          <CollapsedColumn icon="−" title="removed" onExpand={() => setRemovedSize({ ...removedSize, open: true })} />
        )}
        {addedOpen ? (
          <section className="flex min-w-0 flex-1 flex-col">
            <ColumnHeader icon="+" title="added" onCollapse={() => setAddedOpen(false)} />
            <DiffSide rows={rows} side="right" />
          </section>
        ) : (
          <CollapsedColumn icon="+" title="added" onExpand={() => setAddedOpen(true)} />
        )}
      </div>
    </div>
  );
}

function FileBar({ file }: { file: CommitFile }) {
  return (
    <header className="flex items-baseline gap-2 border-b border-panel-edge bg-panel px-2 py-[2px] text-[11px] leading-4">
      <span className="min-w-0 flex-1 truncate text-ink">
        {file.previousFilename && <span className="text-ink-dim">{file.previousFilename} → </span>}
        {file.filename}
      </span>
      <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{file.status}</span>
      <ChangeCounts additions={file.additions} deletions={file.deletions} />
    </header>
  );
}

export function ChangeCounts({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className="shrink-0 text-[9px] leading-4">
      <span className="text-add-ink">+{additions}</span> <span className="text-del-ink">−{deletions}</span>
    </span>
  );
}

function DiffSide({ rows, side }: { rows: DiffRow[]; side: 'left' | 'right' }) {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <div className="w-max min-w-full">
        {rows.map((row, index) => (
          <DiffLine key={index} row={row} cell={side === 'left' ? row.left : row.right} side={side} />
        ))}
      </div>
    </div>
  );
}

function DiffLine({ row, cell, side }: { row: DiffRow; cell: DiffCell | null; side: 'left' | 'right' }) {
  if (row.kind === 'hunk') {
    return (
      <div className={`${ROW} bg-procgen px-1 text-[9px] text-ink-dim`}>
        <span className="truncate">{side === 'left' ? row.label : ''}</span>
      </div>
    );
  }
  if (!cell) return <div className={`${ROW} bg-procgen/40`} />;
  const changed = row.kind === 'change';
  const tone = !changed ? '' : side === 'left' ? 'bg-del-bg text-del-ink' : 'bg-add-bg text-add-ink';
  return (
    <div className={`${ROW} ${tone}`}>
      <span className={GUTTER}>{cell.line}</span>
      <span className="whitespace-pre pr-2 text-[11px]">{cell.text}</span>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <p className="px-2 py-1 text-[11px] text-ink-dim">{text}</p>;
}
