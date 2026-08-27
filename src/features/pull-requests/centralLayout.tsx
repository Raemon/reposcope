'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setCentralView } from './centralViewStore';
import { useColumnNav } from './columnNav';
import type { ColumnId } from './navColumn';

export type CentralTab = 'pulls' | 'discussion' | 'commits' | 'files';

export const SHEET = 'mx-auto w-full max-w-[900px]';
export const SHEET_GUTTER = 'px-5';

const TABS: { tab: CentralTab; column: ColumnId; label: string }[] = [
  { tab: 'pulls', column: 'pulls', label: 'pull requests' },
  { tab: 'discussion', column: 'discussion', label: 'discussion' },
  { tab: 'commits', column: 'commits', label: 'commits' },
  { tab: 'files', column: 'files', label: 'files & diff' },
];

const TAB_OF_COLUMN: Record<ColumnId, CentralTab> = {
  pulls: 'pulls',
  discussion: 'discussion',
  commits: 'commits',
  files: 'files',
  diff: 'files',
};

interface CentralValue {
  central: boolean;
  tab: CentralTab;
  setTab: (tab: CentralTab) => void;
}

const CentralContext = createContext<CentralValue>({ central: false, tab: 'files', setTab: () => {} });

export function CentralLayoutProvider({ central, children }: { central: boolean; children: ReactNode }) {
  const [tab, setTab] = useState<CentralTab>('files');
  useEffect(() => {
    setCentralView(central);
    return () => setCentralView(false);
  }, [central]);
  return <CentralContext.Provider value={{ central, tab, setTab }}>{children}</CentralContext.Provider>;
}

export function useCentralLayout(): CentralValue {
  return useContext(CentralContext);
}

export function useSheetRows(): boolean {
  return useCentralLayout().central;
}

export function useShowsColumn(id: ColumnId): boolean {
  const { central, tab } = useCentralLayout();
  return !central || TAB_OF_COLUMN[id] === tab;
}

export type PaneMode = 'hidden' | 'column' | 'pane';

export function usePaneMode(id: ColumnId): PaneMode {
  const { central } = useCentralLayout();
  if (!useShowsColumn(id)) return 'hidden';
  return central ? 'pane' : 'column';
}

export function useViewHref(): (href: string) => string {
  const { central } = useCentralLayout();
  return (href) => (central ? `${href}${href.includes('?') ? '&' : '?'}view=central` : href);
}

export function CentralSheet({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className={`${SHEET} flex min-h-0 flex-1 flex-col border border-b-0 border-panel-edge bg-panel`}>
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
