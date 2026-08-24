'use client';

import { useCallback, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { plural } from './ColumnPreview';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const MIN_WIDTH = 140;
const MAX_WIDTH = 900;

export interface ColumnSize {
  width: number;
  open: boolean;
}

export function useDragWidth(size: ColumnSize, onSize: (next: ColumnSize) => void) {
  return useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = size.width;
      const move = (moved: PointerEvent) => {
        onSize({ width: clampWidth(startWidth + moved.clientX - startX), open: true });
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    },
    [size.width, onSize],
  );
}

export function DragHandle({ onPointerDown }: { onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      className="absolute inset-y-0 -right-[3px] z-10 w-[6px] cursor-col-resize hover:bg-btn-active"
    />
  );
}

export function CollapsedColumn({
  noun,
  label,
  count,
  icon,
  preview,
  onExpand,
}: {
  noun: string;
  label: string;
  count?: number;
  icon: string;
  preview?: ReactNode;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Expand ${label}`}
      className="flex w-7 min-h-0 shrink-0 flex-col items-center gap-1 border-r border-panel-edge bg-panel py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink"
    >
      <span aria-hidden className="shrink-0 text-[11px] leading-none">{icon}</span>
      {count !== undefined && <span className="shrink-0 text-[10px] leading-none tabular-nums text-ink">{count}</span>}
      <span className="max-h-[40%] shrink-0 overflow-hidden [writing-mode:vertical-rl]">{noun}</span>
      {preview}
    </button>
  );
}

export function ColumnHeader({
  label,
  icon,
  note,
  onCollapse,
}: {
  label: string;
  icon: string;
  note?: string;
  onCollapse: () => void;
}) {
  return (
    <SelectableRow
      onActivate={onCollapse}
      label={`Collapse ${label}`}
      className="flex w-full shrink-0 items-center gap-1.5 border-b border-panel-edge bg-panel px-1.5 py-[1px] text-left hover:bg-btn-hover"
    >
      <span aria-hidden className="shrink-0 text-[11px] leading-4 text-ink-dim">{icon}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink-dim">{label}</span>
      {note && <span className="min-w-0 flex-1 truncate text-[10px] text-ink-dim">{note}</span>}
      <span aria-hidden className="ml-auto shrink-0 px-1 text-[11px] leading-none text-ink-dim">‹</span>
    </SelectableRow>
  );
}

export function ResizableColumn({
  title,
  count,
  icon,
  note,
  preview,
  size,
  onSize,
  children,
}: {
  title: string;
  count?: number;
  icon: string;
  note?: string;
  preview?: ReactNode;
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
  children: ReactNode;
}) {
  const startDrag = useDragWidth(size, onSize);
  const noun = count === undefined ? title : plural(title, count);
  const label = count === undefined ? noun : `${count} ${noun}`;
  if (!size.open)
    return (
      <CollapsedColumn
        noun={noun}
        label={label}
        count={count}
        icon={icon}
        preview={preview}
        onExpand={() => onSize({ ...size, open: true })}
      />
    );
  return (
    <section
      className="relative flex min-h-0 shrink-0 flex-col border-r border-panel-edge bg-panel"
      style={{ width: size.width }}
    >
      <ColumnHeader label={label} icon={icon} note={note} onCollapse={() => onSize({ ...size, open: false })} />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      <DragHandle onPointerDown={startDrag} />
    </section>
  );
}

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}
