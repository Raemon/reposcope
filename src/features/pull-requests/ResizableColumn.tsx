'use client';

import { useCallback, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useColumnNav, type ColumnRow } from './columnNav';
import { COLUMN_HEADER, type ColumnId } from './navColumn';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const HEADER_ROW = 'flex w-full shrink-0 items-center gap-1.5 border-panel-edge px-1.5 py-[1px] text-left';

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
  preview,
  focused,
  onExpand,
  onPointerDown,
  onPointerLeave,
}: {
  title: string;
  icon: string;
  preview?: ReactNode;
  focused: boolean;
  onExpand: () => void;
  onPointerDown: () => void;
  onPointerLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerLeave}
      aria-label={`Expand ${title}`}
      className={`flex w-7 min-h-0 shrink-0 flex-col items-center gap-2.5 border-r py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:text-ink ${columnEdge(focused)}`}
    >
      <span aria-hidden className="shrink-0 text-[11px] leading-none">{icon}</span>
      <span className="max-h-[40%] shrink-0 overflow-hidden [writing-mode:vertical-rl]">{title}</span>
      {preview}
    </button>
  );
}

export function SectionHeader({
  icon,
  title,
  titleTone,
  note,
  chevron,
  tone,
  label,
  expanded,
  cursor,
  onPointerEnter,
  onActivate,
}: {
  icon: string;
  title: string;
  titleTone: string;
  note?: string;
  chevron: string;
  tone: string;
  label: string;
  expanded?: boolean;
  cursor?: boolean;
  onPointerEnter?: () => void;
  onActivate: () => void;
}) {
  return (
    <SelectableRow
      cursor={cursor}
      onPointerEnter={onPointerEnter}
      onActivate={onActivate}
      label={label}
      expanded={expanded}
      className={`${HEADER_ROW} ${tone}`}
    >
      <span aria-hidden className="shrink-0 text-[11px] leading-4 text-ink-dim">{icon}</span>
      <span className={`shrink-0 text-[10px] uppercase tracking-[0.18em] ${titleTone}`}>{title}</span>
      {note && <span className="min-w-0 flex-1 truncate text-[10px] text-ink-dim">{note}</span>}
      <span aria-hidden className="ml-auto shrink-0 px-1 text-[11px] leading-none text-ink-dim">{chevron}</span>
    </SelectableRow>
  );
}

export function ColumnHeader({
  title,
  icon,
  note,
  focused,
  row,
  onCollapse,
}: {
  title: string;
  icon: string;
  note?: string;
  focused: boolean;
  row: ColumnRow;
  onCollapse: () => void;
}) {
  return (
    <SectionHeader
      {...row.props}
      icon={icon}
      title={title}
      titleTone={focused ? 'text-accent' : 'text-ink-dim'}
      note={note}
      chevron="‹"
      tone={`border-b ${headerTone(row, focused)}`}
      label={`Collapse ${title}`}
      onActivate={onCollapse}
    />
  );
}

export function ResizableColumn({
  navId,
  title,
  icon,
  note,
  preview,
  size,
  onSize,
  footer,
  children,
}: {
  navId: ColumnId;
  title: string;
  icon: string;
  note?: string;
  preview?: ReactNode;
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const nav = useColumnNav(navId);
  const startDrag = useDragWidth(size, onSize);
  if (!size.open)
    return (
      <CollapsedColumn
        title={title}
        icon={icon}
        preview={preview}
        focused={nav.focused}
        onExpand={() => onSize({ ...size, open: true })}
        onPointerDown={nav.focus}
        onPointerLeave={nav.clearHover}
      />
    );
  return (
    <section
      onPointerDown={nav.focus}
      onPointerLeave={nav.clearHover}
      className={`relative flex min-h-0 shrink-0 flex-col border-r bg-panel ${columnEdge(nav.focused)}`}
      style={{ width: size.width }}
    >
      <ColumnHeader
        title={title}
        icon={icon}
        note={note}
        focused={nav.focused}
        row={nav.row(COLUMN_HEADER)}
        onCollapse={() => onSize({ ...size, open: false })}
      />
      <div ref={nav.bodyRef} className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
      <DragHandle onPointerDown={startDrag} />
    </section>
  );
}

function columnEdge(focused: boolean): string {
  return focused ? 'border-accent bg-btn' : 'border-panel-edge bg-panel';
}

function headerTone(row: ColumnRow, focused: boolean): string {
  if (row.state !== 'plain') return 'bg-btn-hover';
  return focused ? 'bg-btn' : 'bg-panel';
}

export function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}
