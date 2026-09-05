'use client';

import { useLayoutEffect } from 'react';
import { tabContaining, useCentralLayout, usePaneMode } from './centralLayout';
import { useNavRegistry } from './columnNav';
import type { ColumnId, NavColumn } from './navColumn';
import { useCommand, type CommandSpec } from '@/features/hotkeys/commandStore';

const COLUMN_COMMANDS: Partial<Record<ColumnId, CommandSpec>> = {
  pulls: { id: 'column:pulls', label: 'pull requests column', keys: ['1', 'p'] },
  discussion: { id: 'column:discussion', label: 'discussion column', keys: ['2', 'd'] },
  commits: { id: 'column:commits', label: 'commits column', keys: ['3', 'c'] },
  files: { id: 'column:files', label: 'files column', keys: ['4', 'f'] },
  'ai-chat': { id: 'column:ai-chat', label: 'ai chat column', keys: ['5', 'a'] },
};

export function useRegisterColumn(id: ColumnId, column: NavColumn, available = true) {
  const { register, toggle } = useNavRegistry();
  const visible = available && usePaneMode(id) !== 'hidden';
  useLayoutEffect(() => {
    if (!visible) return;
    register(id, column);
    return () => register(id, null);
  });
  useColumnCommand(id, available, toggle);
}

function useColumnCommand(id: ColumnId, available: boolean, toggle: (id: ColumnId) => void) {
  const { central, setTab } = useCentralLayout();
  useCommand(available ? COLUMN_COMMANDS[id] ?? null : null, () => {
    const tab = tabContaining(id);
    if (central && tab !== null) setTab(tab);
    toggle(id);
  });
}
