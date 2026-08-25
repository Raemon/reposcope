'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { navActionFor, type NavAction } from './columnKeys';
import { COLUMN_HEADER, nextCursor, stepColumn, type ColumnId, type NavColumn } from './navColumn';
import { rowState, type RowState } from '@/features/surface-ui/rowState';

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
  register: (id: ColumnId, column: NavColumn | null) => void;
  registerBody: (id: ColumnId, node: HTMLElement | null) => void;
}

const INERT: NavValue = {
  focused: null,
  cursors: {},
  hover: null,
  setHover: () => {},
  focus: () => {},
  register: () => {},
  registerBody: () => {},
};

const ColumnNavContext = createContext<NavValue>(INERT);

export function ColumnNavProvider({ children }: { children: ReactNode }) {
  const { columns, bodies, register, registerBody } = useColumnRegistry();
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

  useEffect(() => listenForNavKeys(apply), [apply]);
  useEffect(() => {
    document.querySelector('[data-nav-cursor]')?.scrollIntoView({ block: 'nearest' });
  }, [focused, cursors]);

  const value = { focused, cursors, hover, setHover, focus: setFocused, register, registerBody };
  return <ColumnNavContext.Provider value={value}>{children}</ColumnNavContext.Provider>;
}

function useColumnRegistry() {
  const columns = useRef(new Map<ColumnId, NavColumn>());
  const bodies = useRef(new Map<ColumnId, HTMLElement>());
  const register = useCallback((id: ColumnId, column: NavColumn | null) => {
    if (column) columns.current.set(id, column);
    else columns.current.delete(id);
  }, []);
  const registerBody = useCallback((id: ColumnId, node: HTMLElement | null) => {
    if (node) bodies.current.set(id, node);
    else bodies.current.delete(id);
  }, []);
  return { columns, bodies, register, registerBody };
}

export interface ColumnRow {
  state: RowState;
  props: { cursor: boolean; onPointerEnter: () => void };
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
  node?.scrollBy({ top: delta * SCROLL_STEP, behavior: 'smooth' });
}

function listenForNavKeys(apply: (action: NavAction) => void) {
  const onKey = (event: KeyboardEvent) => {
    const action = navActionFor(event);
    if (!action) return;
    event.preventDefault();
    apply(action);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
