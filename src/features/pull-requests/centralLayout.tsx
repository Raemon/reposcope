'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { showColumnCommand, useColumnNav, useFocusColumn } from './columnNav';
import type { ColumnId } from './navColumn';
import { useViewMode } from './viewModeStore';
import { useCommands, type Command } from '@/features/commands/commandRegistry';

export type CentralTab = 'pulls' | 'review' | 'ai-chat';

export type PaneFrame = 'pane' | 'preface';

export type PaneMode = 'hidden' | 'column' | PaneFrame;

interface TabEntry {
  tab: CentralTab;
  label: string;
  columns: Partial<Record<ColumnId, PaneMode>>;
  focus: ColumnId;
}

const PULLS_TAB: TabEntry = { tab: 'pulls', label: 'pull requests', columns: { pulls: 'pane' }, focus: 'pulls' };

const SUBJECT_TABS: TabEntry[] = [
  {
    tab: 'review',
    label: 'review',
    columns: { discussion: 'preface', commits: 'column', files: 'column', diff: 'column' },
    focus: 'files',
  },
  { tab: 'ai-chat', label: 'ai chat', columns: { 'ai-chat': 'pane' }, focus: 'ai-chat' },
];

const ALL_TABS = [PULLS_TAB, ...SUBJECT_TABS];

const ENTRY_OF_TAB = new Map<CentralTab, TabEntry>(ALL_TABS.map((entry) => [entry.tab, entry]));

export const PANE_WIDTH = 'mx-auto w-full max-w-[980px]';

const TAB_ROW = 'shrink-0 border-b border-panel-edge bg-panel py-1';
const TAB_BUTTON = 'rounded px-1.5 py-[2px] text-[10px] uppercase tracking-[0.18em]';

interface CentralValue {
  central: boolean;
  tab: CentralTab;
  setTab: (tab: CentralTab) => void;
}

const CentralContext = createContext<CentralValue>({ central: false, tab: 'review', setTab: () => {} });

const NO_COMMANDS: Command[] = [];

export function CentralLayoutProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<CentralTab>('review');
  const central = useViewMode() === 'central';
  const focus = useFocusColumn();
  useCommands(
    central
      ? tabColumnCommands((id) => {
          setTab(tabShowing(id));
          focus(id);
        })
      : NO_COMMANDS,
  );
  return <CentralContext.Provider value={{ central, tab, setTab }}>{children}</CentralContext.Provider>;
}

export function useCentralLayout(): CentralValue {
  return useContext(CentralContext);
}

function entryOf(tab: CentralTab): TabEntry {
  return ENTRY_OF_TAB.get(tab) ?? PULLS_TAB;
}

function tabShowing(id: ColumnId): CentralTab {
  return ALL_TABS.find((entry) => id in entry.columns)?.tab ?? PULLS_TAB.tab;
}

// Hidden central columns never register with ColumnNav, so their commands live here.
function tabColumnCommands(show: (id: ColumnId) => void): Command[] {
  return ALL_TABS.flatMap((entry) => (Object.keys(entry.columns) as ColumnId[]).map((id) => showColumnCommand(id, show)));
}

export function usePaneMode(id: ColumnId): PaneMode {
  const { central, tab } = useCentralLayout();
  return central ? entryOf(tab).columns[id] ?? 'hidden' : 'column';
}

export function useShowsColumn(id: ColumnId): boolean {
  return usePaneMode(id) !== 'hidden';
}

export function CentralTabBar() {
  const { central } = useCentralLayout();
  if (!central) return null;
  return (
    <div className={TAB_ROW}>
      <div className="relative flex items-center px-1.5">
        <div className="absolute left-1.5">
          <TabButton {...PULLS_TAB} />
        </div>
        <div className="mx-auto flex items-center gap-1">
          {SUBJECT_TABS.map((entry) => (
            <TabButton key={entry.tab} {...entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TabButton({ tab, label, focus }: TabEntry) {
  const { tab: active, setTab } = useCentralLayout();
  const nav = useColumnNav(focus);
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
