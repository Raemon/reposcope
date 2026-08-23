'use client';

import { useCallback, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

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
  title,
  icon,
  onExpand,
}: {
  title: string;
  icon: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Expand ${title}`}
      className="flex w-6 shrink-0 flex-col items-center gap-1 border-r border-panel-edge bg-panel py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink"
    >
      <span aria-hidden className="text-[11px] leading-none">{icon}</span>
      <span className="[writing-mode:vertical-rl]">{title}</span>
    </button>
  );
}

export function ColumnHeader({
  title,
  icon,
  note,
  onCollapse,
}: {
  title: string;
  icon: string;
  note?: string;
  onCollapse: () => void;
}) {
  return (
    <header className="flex items-center gap-1.5 border-b border-panel-edge bg-panel px-1.5 py-[1px]">
      <span aria-hidden className="shrink-0 text-[11px] leading-4 text-ink-dim">{icon}</span>
      <h2 className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink-dim">{title}</h2>
      {note && <span className="min-w-0 flex-1 truncate text-[10px] text-ink-dim">{note}</span>}
      <button
        type="button"
        onClick={onCollapse}
        aria-label={`Collapse ${title}`}
        className="ml-auto shrink-0 px-1 text-[11px] leading-none text-ink-dim hover:text-ink"
      >
        ‹
      </button>
    </header>
  );
}

export function ResizableColumn({
  title,
  icon,
  note,
  size,
  onSize,
  children,
}: {
  title: string;
  icon: string;
  note?: string;
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
  children: ReactNode;
}) {
  const startDrag = useDragWidth(size, onSize);
  if (!size.open) return <CollapsedColumn title={title} icon={icon} onExpand={() => onSize({ ...size, open: true })} />;
  return (
    <section
      className="relative flex min-h-0 shrink-0 flex-col border-r border-panel-edge bg-panel"
      style={{ width: size.width }}
    >
      <ColumnHeader title={title} icon={icon} note={note} onCollapse={() => onSize({ ...size, open: false })} />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      <DragHandle onPointerDown={startDrag} />
    </section>
  );
}

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}
