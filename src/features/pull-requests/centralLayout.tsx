'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColumnNav } from './columnNav';
import type { ColumnId } from './navColumn';
import { useNarrowViewport } from './narrowViewport';
import { useViewMode } from './viewModeStore';

export type CentralTab = 'pulls' | 'discussion' | 'commits' | 'files';

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

export const PANE_WIDTH = 'mx-auto w-full max-w-[980px]';

const TAB_ROW = 'shrink-0 border-b border-panel-edge bg-panel py-1';
const TAB_BUTTON = 'rounded px-1.5 py-[2px] text-[10px] uppercase tracking-[0.18em]';

interface CentralValue {
  central: boolean;
  tab: CentralTab;
  setTab: (tab: CentralTab) => void;
}

const CentralContext = createContext<CentralValue>({ central: false, tab: 'files', setTab: () => {} });

export function CentralLayoutProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<CentralTab>('files');
  const central = useViewMode() === 'central';
  return <CentralContext.Provider value={{ central, tab, setTab }}>{children}</CentralContext.Provider>;
}

export function useCentralLayout(): CentralValue {
  return useContext(CentralContext);
}

export function useShowsColumn(id: ColumnId): boolean {
  const { central, tab } = useCentralLayout();
  const stacked = useNarrowViewport();
  return stacked || !central || TAB_OF_COLUMN[id] === tab;
}

export type PaneMode = 'hidden' | 'column' | 'pane' | 'stacked';

export function usePaneMode(id: ColumnId): PaneMode {
  const { central } = useCentralLayout();
  const stacked = useNarrowViewport();
  const shown = useShowsColumn(id);
  if (!shown) return 'hidden';
  if (stacked) return 'stacked';
  return central && id !== 'files' ? 'pane' : 'column';
}

export function CentralTabBar() {
  const { central } = useCentralLayout();
  const stacked = useNarrowViewport();
  if (!central || stacked) return null;
  return (
    <div className={TAB_ROW}>
      <div className={`${PANE_WIDTH} flex items-center gap-1`}>
        {TABS.map((entry) => (
          <TabButton key={entry.tab} {...entry} />
        ))}
      </div>
    </div>
  );
}

function TabButton({ tab, column, label }: { tab: CentralTab; column: ColumnId; label: string }) {
  const { tab: active, setTab } = useCentralLayout();
  const nav = useColumnNav(column);
  return (
    <button
      type="button"
      aria-current={tab === active ? 'page' : undefined}
      onClick={() => {
        setTab(tab);
        nav.focus();
      }}
      className={`${TAB_BUTTON} ${tab === active ? 'bg-btn-active text-accent' : 'text-ink-dim hover:text-ink'}`}
    >
      {label}
    </button>
  );
}
