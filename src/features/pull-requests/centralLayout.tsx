'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColumnNav } from './columnNav';
import type { ColumnId } from './navColumn';
import { useViewMode } from './viewModeStore';

export type CentralTab = 'pulls' | 'discussion' | 'commits' | 'files' | 'ai-chat';

interface TabEntry {
  tab: CentralTab;
  label: string;
  columns: [ColumnId, ...ColumnId[]];
  centered: boolean;
}

const PULLS_TAB: TabEntry = { tab: 'pulls', label: 'pull requests', columns: ['pulls'], centered: true };

const SUBJECT_TABS: TabEntry[] = [
  { tab: 'discussion', label: 'discussion', columns: ['discussion'], centered: true },
  { tab: 'commits', label: 'commits', columns: ['commits', 'files', 'diff'], centered: false },
  { tab: 'files', label: 'files & diff', columns: ['files', 'diff'], centered: false },
  { tab: 'ai-chat', label: 'ai chat', columns: ['ai-chat'], centered: true },
];

const ENTRY_OF_TAB = new Map<CentralTab, TabEntry>([PULLS_TAB, ...SUBJECT_TABS].map((entry) => [entry.tab, entry]));

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

function entryOf(tab: CentralTab): TabEntry {
  return ENTRY_OF_TAB.get(tab) ?? PULLS_TAB;
}

export function useShowsColumn(id: ColumnId): boolean {
  const { central, tab } = useCentralLayout();
  return !central || entryOf(tab).columns.includes(id);
}

export type PaneMode = 'hidden' | 'column' | 'pane';

export function usePaneMode(id: ColumnId): PaneMode {
  const { central, tab } = useCentralLayout();
  const shown = useShowsColumn(id);
  if (!shown) return 'hidden';
  return central && entryOf(tab).centered ? 'pane' : 'column';
}

// Central tabs pick which columns to show, so a column left collapsed in the column view must not come up empty here.
export function useForcedOpen(): boolean {
  return useCentralLayout().central;
}

export function CentralTabBar({ hasDiscussion }: { hasDiscussion: boolean }) {
  const { central } = useCentralLayout();
  if (!central) return null;
  return (
    <div className={TAB_ROW}>
      <div className="relative flex items-center px-1.5">
        <div className="absolute left-1.5">
          <TabButton {...PULLS_TAB} />
        </div>
        <div className="mx-auto flex items-center gap-1">
          {subjectTabs(hasDiscussion).map((entry) => (
            <TabButton key={entry.tab} {...entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function subjectTabs(hasDiscussion: boolean): TabEntry[] {
  return hasDiscussion ? SUBJECT_TABS : SUBJECT_TABS.filter((entry) => entry.tab !== 'discussion');
}

function TabButton({ tab, label, columns }: TabEntry) {
  const { tab: active, setTab } = useCentralLayout();
  const nav = useColumnNav(columns[0]);
  return (
    <button
      type="button"
      aria-current={tab === active ? 'page' : undefined}
      onClick={() => {
        setTab(tab);
        nav.focus();
      }}
      className={`${TAB_BUTTON} ${tab === active ? 'bg-btn-active text-accent' : 'text-ink-dim hover:bg-btn-hover hover:text-ink'}`}
    >
      {label}
    </button>
  );
}
