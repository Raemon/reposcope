'use client';

import { useCallback, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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
  chevron: string;
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
  action,
  chevron = '‹',
  label = `Collapse ${title}`,
  onCollapse,
}: {
  title: string;
  icon: string;
  note?: string;
  focused: boolean;
  row: ColumnRow;
  action?: ReactNode;
  chevron?: string;
  label?: string;
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
        chevron={chevron}
        className="min-w-0 flex-1"
        label={label}
        onActivate={onCollapse}
      />
      {action}
    </div>
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
  action,
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
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const nav = useColumnNav(navId);
  const startDrag = useDragWidth(size, onSize);
  const pane = usePaneMode(navId);
  if (pane === 'hidden') return null;
  if (pane === 'stacked')
    return (
      <StackedColumn nav={nav} title={title} icon={icon} note={note} size={size} onSize={onSize} action={action} footer={footer}>
        {children}
      </StackedColumn>
    );
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
        action={action}
        onCollapse={() => onSize({ ...size, open: false })}
      />
      <div ref={nav.bodyRef} className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
      <DragHandle onPointerDown={startDrag} />
    </section>
  );
}

function StackedColumn({
  nav,
  title,
  icon,
  note,
  size,
  onSize,
  action,
  footer,
  children,
}: {
  nav: ReturnType<typeof useColumnNav>;
  title: string;
  icon: string;
  note?: string;
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section onPointerDown={nav.focus} onPointerLeave={nav.clearHover} className="flex shrink-0 flex-col bg-panel">
      <ColumnHeader
        title={title}
        icon={icon}
        note={note}
        focused={nav.focused}
        row={nav.row(COLUMN_HEADER)}
        action={action}
        chevron={size.open ? '⌄' : '›'}
        label={`${size.open ? 'Collapse' : 'Expand'} ${title}`}
        onCollapse={() => onSize({ ...size, open: !size.open })}
      />
      {size.open && (
        <>
          <div ref={nav.bodyRef} className="max-h-[50vh] overflow-auto">{children}</div>
          {footer}
        </>
      )}
    </section>
  );
}

function columnEdge(focused: boolean): string {
  return focused ? 'border-accent bg-btn' : 'border-panel-edge bg-panel';
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
