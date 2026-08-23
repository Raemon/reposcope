'use client';

import { useState } from 'react';
import { ChangeCounts } from './ChangeCounts';
import { ColumnHeader, CollapsedColumn, DragHandle, useDragWidth, type ColumnSize } from './ResizableColumn';
import { splitDiff, type DiffCell, type DiffRow } from './splitDiff';
import type { ChangedFile } from './pullRequests';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
const GUTTER = 'w-[38px] shrink-0 select-none pr-1 text-right text-[9px] text-ink-dim';

export function DiffPanes({ file }: { file: ChangedFile | null }) {
  const [removedSize, setRemovedSize] = useState<ColumnSize>({ width: 520, open: true });
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
            <DiffSide rows={rows} side="left" labels />
            {addedOpen && <DragHandle onPointerDown={startDrag} />}
          </section>
        ) : (
          <CollapsedColumn icon="−" title="removed" onExpand={() => setRemovedSize({ ...removedSize, open: true })} />
        )}
        {addedOpen ? (
          <section className="flex min-w-0 flex-1 flex-col">
            <ColumnHeader icon="+" title="added" onCollapse={() => setAddedOpen(false)} />
            <DiffSide rows={rows} side="right" labels={!removedSize.open} />
          </section>
        ) : (
          <CollapsedColumn icon="+" title="added" onExpand={() => setAddedOpen(true)} />
        )}
      </div>
    </div>
  );
}

function FileBar({ file }: { file: ChangedFile }) {
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

function DiffSide({ rows, side, labels }: { rows: DiffRow[]; side: 'left' | 'right'; labels: boolean }) {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <div className="w-max min-w-full">
        {rows.map((row, index) => (
          <DiffLine key={index} row={row} cell={side === 'left' ? row.left : row.right} side={side} labels={labels} />
        ))}
      </div>
    </div>
  );
}

function DiffLine({
  row,
  cell,
  side,
  labels,
}: {
  row: DiffRow;
  cell: DiffCell | null;
  side: 'left' | 'right';
  labels: boolean;
}) {
  if (row.kind === 'hunk') {
    return (
      <div className={`${ROW} bg-procgen px-1 text-[9px] text-ink-dim`}>
        <span className="truncate">{labels ? row.label : ''}</span>
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
