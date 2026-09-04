'use client';

import { useLayoutEffect } from 'react';
import { tabShowing, useCentralLayout, usePaneMode } from './centralLayout';
import { useColumnNav, useNavRegister } from './columnNav';
import type { ColumnId, NavColumn } from './navColumn';
import { useCommand, type CommandSpec } from '@/features/hotkeys/commandStore';

const COLUMN_COMMANDS: Partial<Record<ColumnId, CommandSpec>> = {
  pulls: { id: 'column:pulls', label: 'pull requests column', keys: ['1', 'p'] },
  discussion: { id: 'column:discussion', label: 'discussion column', keys: ['2', 'd'] },
  commits: { id: 'column:commits', label: 'commits column', keys: ['3', 'c'] },
  files: { id: 'column:files', label: 'files column', keys: ['4', 'f'] },
  'ai-chat': { id: 'column:ai-chat', label: 'ai chat column', keys: ['5', 'a'] },
};

export function useRegisterColumn(id: ColumnId, column: NavColumn, present = true) {
  const register = useNavRegister();
  const shown = present && usePaneMode(id) !== 'hidden';
  useLayoutEffect(() => {
    if (!shown) return;
    register(id, column);
    return () => register(id, null);
  });
  useColumnCommand(id, present);
}

function useColumnCommand(id: ColumnId, present: boolean) {
  const { central, setTab } = useCentralLayout();
  const nav = useColumnNav(id);
  useCommand(present ? COLUMN_COMMANDS[id] ?? null : null, () => {
    const tab = tabShowing(id);
    if (central && tab !== null) setTab(tab);
    nav.toggle();
  });
}
