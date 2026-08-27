'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { setCentralTab, useCentralTab, type CentralTab } from './centralTabStore';
import { useColumnNav } from './columnNav';
import type { ColumnId } from './navColumn';
import { useViewMode } from './viewModeStore';

export type { CentralTab };

export const SHEET_GUTTER = 'px-5';

const TABS: { tab: CentralTab; column: ColumnId; label: string }[] = [
  { tab: 'pulls', column: 'pulls', label: 'pull requests' },
  { tab: 'discussion', column: 'discussion', label: 'discussion' },
  { tab: 'commits', column: 'commits', label: 'commits' },
  { tab: 'files', column: 'files', label: 'files & diff' },
];

const COLUMNS_OF_TAB: Record<CentralTab, ColumnId[]> = {
  pulls: ['pulls'],
  discussion: ['discussion'],
  commits: ['commits', 'files', 'diff'],
  files: ['files', 'diff'],
};

const SHEET_MAX: Record<CentralTab, string> = {
  pulls: 'max-w-[900px]',
  discussion: 'max-w-[900px]',
  commits: 'max-w-[1500px]',
  files: 'max-w-[1200px]',
};

interface CentralValue {
  central: boolean;
  tab: CentralTab;
  setTab: (tab: CentralTab) => void;
}

const CentralContext = createContext(false);

export function CentralLayoutProvider({ children }: { children: ReactNode }) {
  const central = useViewMode() === 'central';
  return <CentralContext.Provider value={central}>{children}</CentralContext.Provider>;
}

export function useCentralLayout(): CentralValue {
  return { central: useContext(CentralContext), tab: useCentralTab(), setTab: setCentralTab };
}

export function useSheetBand(): string {
  return `mx-auto w-full ${SHEET_MAX[useCentralTab()]}`;
}

export function useShowsColumn(id: ColumnId): boolean {
  const { central, tab } = useCentralLayout();
  return !central || COLUMNS_OF_TAB[tab].includes(id);
}

export type PaneMode = 'hidden' | 'column' | 'pane';

export function usePaneMode(id: ColumnId): PaneMode {
  const { central, tab } = useCentralLayout();
  if (!useShowsColumn(id)) return 'hidden';
  return central && COLUMNS_OF_TAB[tab].length === 1 ? 'pane' : 'column';
}

export function useSheetRows(id: ColumnId): boolean {
  return usePaneMode(id) === 'pane';
}

export function CentralSheet({ head, children }: { head: ReactNode; children: ReactNode }) {
  const band = useSheetBand();
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className={`${band} flex min-h-0 flex-1 flex-col border border-b-0 border-panel-edge bg-panel`}>
        {head}
        {children}
      </div>
    </div>
  );
}

export function CentralTabBar({
  counts,
  trailing,
}: {
  counts: Partial<Record<CentralTab, number>>;
  trailing?: ReactNode;
}) {
  return (
    <div className={`flex shrink-0 items-stretch gap-5 border-b border-panel-edge ${SHEET_GUTTER}`}>
      {TABS.map((entry) => (
        <TabButton key={entry.tab} {...entry} count={counts[entry.tab]} />
      ))}
      {trailing && <div className="ml-auto flex items-center">{trailing}</div>}
    </div>
  );
}

function TabButton({
  tab,
  column,
  label,
  count,
}: {
  tab: CentralTab;
  column: ColumnId;
  label: string;
  count?: number;
}) {
  const { tab: active, setTab } = useCentralLayout();
  const nav = useColumnNav(column);
  const on = tab === active;
  return (
    <button
      type="button"
      aria-current={on ? 'page' : undefined}
      onClick={() => {
        setTab(tab);
        nav.focus();
      }}
      className={`-mb-px flex items-baseline gap-1.5 border-b-2 pt-2.5 pb-2 text-label uppercase ${tabTone(on)}`}
    >
      {label}
      {count !== undefined && <span className="text-meta opacity-60">{count}</span>}
    </button>
  );
}

function tabTone(on: boolean): string {
  return on ? 'border-accent text-accent' : 'border-transparent text-ink-dim hover:text-ink';
}
