'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { COLUMN_HEADER, COLUMN_ORDER, nextCursor, stepColumn, type ColumnId, type NavColumn } from './navColumn';
import { useCommands, type Command } from '@/features/commands/commandRegistry';
import { command, type CommandId } from '@/features/commands/keybindings';
import { rowState, type RowState } from '@/features/surface-ui/rowState';

type NavAction =
  | { kind: 'column'; delta: number }
  | { kind: 'cursor'; delta: number }
  | { kind: 'activate' }
  | { kind: 'escape' };

const COLUMN_TITLE: Record<ColumnId, string> = {
  pulls: 'pull requests',
  discussion: 'discussion',
  commits: 'commits',
  files: 'files',
  diff: 'diff',
  'ai-chat': 'AI chat',
};

const COLUMN_COMMAND: Record<ColumnId, CommandId> = {
  pulls: 'column.pulls',
  discussion: 'column.discussion',
  commits: 'column.commits',
  files: 'column.files',
  diff: 'column.diff',
  'ai-chat': 'column.aiChat',
};

const SCROLL_STEP = 60;

type Cursors = Partial<Record<ColumnId, string>>;

interface Hover {
  column: ColumnId;
  item: string;
}

interface NavValue {
  focused: ColumnId | null;
  cursors: Cursors;
  hover: Hover | null;
  setHover: (hover: Hover | null) => void;
  focus: (column: ColumnId) => void;
  activate: (column: ColumnId, item: string) => void;
  register: (id: ColumnId, column: NavColumn | null) => void;
  registerBody: (id: ColumnId, node: HTMLElement | null) => void;
}

const INERT: NavValue = {
  focused: null,
  cursors: {},
  hover: null,
  setHover: () => {},
  focus: () => {},
  activate: () => {},
  register: () => {},
  registerBody: () => {},
};

const ColumnNavContext = createContext<NavValue>(INERT);

export function ColumnNavProvider({ children }: { children: ReactNode }) {
  const { columns, bodies, live, register, registerBody } = useColumnRegistry();
  const [focused, setFocused] = useState<ColumnId>('files');
  const [cursors, setCursors] = useState<Cursors>({});
  const [hover, setHover] = useState<Hover | null>(null);

  const setCursor = useCallback((id: ColumnId, item: string | null) => {
    setCursors((held) => ({ ...held, [id]: item ?? undefined }));
  }, []);

  const moveCursor = useCallback(
    (column: NavColumn, delta: number) => {
      if (column.items.length === 0) return scrollBody(bodies.current.get(focused), delta);
      const next = nextCursor(column, cursors[focused] ?? null, delta);
      setCursor(focused, next);
      if (next !== null && next !== COLUMN_HEADER) column.onSelect?.(next);
    },
    [focused, cursors, setCursor],
  );

  const apply = useCallback(
    (action: NavAction) => {
      if (action.kind === 'column') return setFocused((held) => stepToLiveColumn(columns.current, held, action.delta));
      const column = columns.current.get(focused);
      if (!column) return setFocused(stepToLiveColumn(columns.current, focused, 1));
      if (action.kind === 'cursor') return moveCursor(column, action.delta);
      if (action.kind === 'escape') return setCursor(focused, column.selected);
      activateColumn(column, cursors[focused] ?? null);
    },
    [focused, cursors, moveCursor, setCursor],
  );

  const activate = useCallback((id: ColumnId, item: string) => {
    const column = columns.current.get(id);
    (column?.onActivate ?? column?.onSelect)?.(item);
  }, []);

  const showColumn = useCallback((id: ColumnId) => {
    setFocused(id);
    columns.current.get(id)?.setOpen?.(true);
  }, []);
  const toggleFocused = useCallback(() => {
    const column = columns.current.get(focused);
    column?.setOpen?.(!column.open);
  }, [focused]);
  useCommands(navCommands(apply, live, showColumn, toggleFocused));
  useEffect(() => {
    document.querySelector('[data-nav-cursor]')?.scrollIntoView({ block: 'nearest' });
  }, [focused, cursors]);

  const value = { focused, cursors, hover, setHover, focus: setFocused, activate, register, registerBody };
  return <ColumnNavContext.Provider value={value}>{children}</ColumnNavContext.Provider>;
}

function useColumnRegistry() {
  const columns = useRef(new Map<ColumnId, NavColumn>());
  const bodies = useRef(new Map<ColumnId, HTMLElement>());
  const [live, setLive] = useState<ColumnId[]>([]);
  const syncing = useRef(false);
  const register = useCallback((id: ColumnId, column: NavColumn | null) => {
    if (column) columns.current.set(id, column);
    else columns.current.delete(id);
    if (!syncing.current) syncLive(columns.current, syncing, setLive);
  }, []);
  const registerBody = useCallback((id: ColumnId, node: HTMLElement | null) => {
    if (node) bodies.current.set(id, node);
    else bodies.current.delete(id);
  }, []);
  return { columns, bodies, live, register, registerBody };
}

// Each commit re-registers columns (delete, then set); read membership after both.
function syncLive(columns: Map<ColumnId, NavColumn>, syncing: { current: boolean }, setLive: (update: (held: ColumnId[]) => ColumnId[]) => void) {
  syncing.current = true;
  queueMicrotask(() => {
    syncing.current = false;
    const ids = COLUMN_ORDER.filter((held) => columns.has(held));
    // Keep the same array when unchanged, or every commit republishes and re-renders forever.
    setLive((held) => (sameIds(held, ids) ? held : ids));
  });
}

function sameIds(a: ColumnId[], b: ColumnId[]): boolean {
  return a.length === b.length && a.every((id, at) => id === b[at]);
}

export function showColumnCommand(id: ColumnId, show: (id: ColumnId) => void): Command {
  return command(COLUMN_COMMAND[id], `Show the ${COLUMN_TITLE[id]} column`, () => show(id));
}

function navCommands(
  apply: (action: NavAction) => void,
  live: ColumnId[],
  showColumn: (id: ColumnId) => void,
  toggleFocused: () => void,
): Command[] {
  return [
    command('nav.left', 'Focus the column to the left', () => apply({ kind: 'column', delta: -1 })),
    command('nav.right', 'Focus the column to the right', () => apply({ kind: 'column', delta: 1 })),
    command('nav.up', 'Move the cursor up', () => apply({ kind: 'cursor', delta: -1 })),
    command('nav.down', 'Move the cursor down', () => apply({ kind: 'cursor', delta: 1 })),
    command('nav.activate', 'Open the row under the cursor', () => apply({ kind: 'activate' })),
    command('nav.escape', 'Return the cursor to the selected row', () => apply({ kind: 'escape' })),
    command('column.toggle', 'Collapse or expand the focused column', toggleFocused),
    ...live.map((id) => showColumnCommand(id, showColumn)),
  ];
}

export interface ColumnRow {
  state: RowState;
  props: { cursor: boolean; onPointerEnter: () => void };
}

export function useFocusColumn(): (id: ColumnId) => void {
  return useContext(ColumnNavContext).focus;
}

export function useColumnNav(id: ColumnId) {
  const nav = useContext(ColumnNavContext);
  const bodyRef = useCallback((node: HTMLElement | null) => nav.registerBody(id, node), [nav, id]);
  const cursor = nav.cursors[id] ?? null;
  const hovered = nav.hover?.column === id ? nav.hover.item : null;
  const focused = nav.focused === id;
  const highlighted = (item: string) => (hovered === null ? cursor === item : hovered === item);
  return {
    focused,
    cursor,
    focus: () => nav.focus(id),
    activate: (item: string) => nav.activate(id, item),
    clearHover: () => nav.setHover(null),
    bodyRef,
    row: (item: string, selected = false): ColumnRow => ({
      state: rowState(selected, highlighted(item)),
      props: { cursor: focused && cursor === item, onPointerEnter: () => nav.setHover({ column: id, item }) },
    }),
  };
}

export function useRegisterColumn(id: ColumnId, column: NavColumn, active = true) {
  const nav = useContext(ColumnNavContext);
  useLayoutEffect(() => {
    if (!active) return;
    nav.register(id, column);
    return () => nav.register(id, null);
  });
}

function stepToLiveColumn(columns: Map<ColumnId, NavColumn>, from: ColumnId, delta: number): ColumnId {
  for (let at = stepColumn(from, delta); at !== from; at = stepColumn(at, delta)) {
    if (columns.has(at)) return at;
    if (stepColumn(at, delta) === at) break;
  }
  return from;
}

function activateColumn(column: NavColumn, cursor: string | null) {
  if (!column.open) return column.setOpen?.(true);
  if (cursor === COLUMN_HEADER) return column.setOpen?.(false);
  if (cursor !== null) column.onActivate?.(cursor);
}

function scrollBody(node: HTMLElement | undefined, delta: number) {
  scrollerOf(node)?.scrollBy({ top: delta * SCROLL_STEP, behavior: 'smooth' });
}

function scrollerOf(node: HTMLElement | undefined): HTMLElement | null {
  for (let at = node ?? null; at; at = at.parentElement) if (at.scrollHeight > at.clientHeight) return at;
  return null;
}
