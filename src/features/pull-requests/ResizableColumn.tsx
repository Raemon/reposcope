'use client';

import { useCallback, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { PANE_WIDTH, usePaneMode } from './centralLayout';
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

export function collapsibleColumn(size: ColumnSize, onSize: (next: ColumnSize) => void) {
  return { open: size.open, collapsible: true, setOpen: (open: boolean) => onSize({ ...size, open }) };
}

export type DragEdge = 'left' | 'right';

export type ColumnSide = 'left' | 'right';

const OUTER_EDGE: Record<ColumnSide, string> = { left: 'md:border-r', right: 'md:border-l' };

export function useDragWidth(size: ColumnSize, onSize: (next: ColumnSize) => void, edge: DragEdge = 'right') {
  return useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = size.width;
      const move = (moved: PointerEvent) => {
        onSize({ width: clampWidth(startWidth + grownBy(moved.clientX - startX, edge)), open: true });
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
    [size.width, onSize, edge],
  );
}

function grownBy(dragged: number, edge: DragEdge): number {
  return edge === 'left' ? -dragged : dragged;
}

export function DragHandle({
  onPointerDown,
  edge = 'right',
}: {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  edge?: DragEdge;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      className={`absolute inset-y-0 z-10 hidden w-[6px] cursor-col-resize hover:bg-btn-active md:block ${
        edge === 'left' ? '-left-[3px]' : '-right-[3px]'
      }`}
    />
  );
}

export function CollapsedColumn({
  title,
  icon,
  preview,
  focused,
  side,
  onExpand,
  onPointerDown,
  onPointerLeave,
}: {
  title: string;
  icon: string;
  preview?: ReactNode;
  focused: boolean;
  side: ColumnSide;
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
      className={`flex w-full shrink-0 items-center gap-1.5 border-b px-1.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:text-ink md:w-7 md:min-h-0 md:flex-col md:gap-2.5 md:border-b-0 ${OUTER_EDGE[side]} md:px-0 ${columnEdge(focused)}`}
    >
      <span aria-hidden className="shrink-0 text-[11px] leading-none">{icon}</span>
      <span className="shrink-0 overflow-hidden md:max-h-[40%] md:[writing-mode:vertical-rl]">{title}</span>
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
  className,
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
  chevron: ReactNode;
  className: string;
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
      className={`${HEADER_ROW} ${className}`}
    >
      <span aria-hidden className="shrink-0 text-[11px] leading-4 text-ink-dim">{icon}</span>
      <span className={`shrink-0 text-[10px] uppercase tracking-[0.18em] ${titleTone}`}>{title}</span>
      {note && <span className="min-w-0 flex-1 truncate text-[10px] text-ink-dim">{note}</span>}
      <span aria-hidden className="ml-auto shrink-0 px-1 text-[14px] leading-none text-ink-dim">{chevron}</span>
    </SelectableRow>
  );
}

export function ColumnHeader({
  title,
  icon,
  note,
  focused,
  row,
  action,
  onCollapse,
}: {
  title: string;
  icon: string;
  note?: string;
  focused: boolean;
  row: ColumnRow;
  action?: ReactNode;
  onCollapse: () => void;
}) {
  return (
    <div className={`flex shrink-0 items-center ${headerTone(row, focused)}`}>
      <SectionHeader
        {...row.props}
        icon={icon}
        title={title}
        titleTone={focused ? 'text-accent' : 'text-ink-dim'}
        note={note}
        chevron={<span className="inline-block max-md:-rotate-90">‹</span>}
        className="min-w-0 flex-1"
        label={`Collapse ${title}`}
        onActivate={onCollapse}
      />
      {action}
    </div>
  );
}

interface ColumnProps {
  navId: ColumnId;
  title: string;
  icon: string;
  note?: string;
  preview?: ReactNode;
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
  action?: ReactNode;
  footer?: ReactNode;
  tone?: string;
  side?: ColumnSide;
  children: ReactNode;
}

export function ResizableColumn(props: ColumnProps) {
  const { navId, title, icon, note, preview, size, onSize, action, footer, tone = 'bg-panel', side = 'left', children } = props;
  const nav = useColumnNav(navId);
  const startDrag = useDragWidth(size, onSize);
  const pane = usePaneMode(navId);
  if (pane === 'hidden') return null;
  if (pane === 'pane')
    return (
      <section onPointerDown={nav.focus} onPointerLeave={nav.clearHover} className="flex min-h-0 min-w-0 flex-1 flex-col bg-panel">
        <div ref={nav.bodyRef} className="min-h-0 flex-1 overflow-auto">
          <div className={PANE_WIDTH}>{children}</div>
        </div>
        {footer}
      </section>
    );
  if (!size.open)
    return (
      <CollapsedColumn
        title={title}
        icon={icon}
        preview={preview}
        focused={nav.focused}
        side={side}
        onExpand={() => onSize({ ...size, open: true })}
        onPointerDown={nav.focus}
        onPointerLeave={nav.clearHover}
      />
    );
  return (
    <section
      onPointerDown={nav.focus}
      onPointerLeave={nav.clearHover}
      className={`relative flex w-full shrink-0 flex-col border-b md:w-[var(--col-w)] md:min-h-0 md:border-b-0 ${OUTER_EDGE[side]} ${columnEdge(nav.focused, tone)}`}
      style={{ '--col-w': `${size.width}px` } as CSSProperties}
    >
      <ColumnHeader
        title={title}
        icon={icon}
        note={note}
        focused={nav.focused}
        row={nav.row(COLUMN_HEADER)}
        action={action}
        onCollapse={() => onSize({ ...size, open: false })}
      />
      <div ref={nav.bodyRef} className="max-h-[50vh] overflow-auto md:max-h-none md:min-h-0 md:flex-1">{children}</div>
      {footer}
      <DragHandle onPointerDown={startDrag} />
    </section>
  );
}

function columnEdge(focused: boolean, tone = 'bg-panel'): string {
  return focused ? 'border-accent/35 bg-btn' : `border-panel-edge ${tone}`;
}

function headerTone(row: ColumnRow, focused: boolean): string {
  return `border-b border-panel-edge ${headerFill(row, focused)}`;
}

function headerFill(row: ColumnRow, focused: boolean): string {
  if (row.state !== 'plain') return 'bg-btn-hover';
  return focused ? 'bg-btn' : 'bg-panel';
}

export function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}
