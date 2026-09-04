'use client';

import type { Command } from './commandRegistry';
import { command } from './keybindings';
import { DIFF_LAYOUT_LABEL, setDiffLayout, type DiffLayout } from '@/features/pull-requests/diffLayoutStore';
import { DIFF_SORT_LABEL, diffSortTitle, setDiffSort, type DiffSort } from '@/features/pull-requests/diffSortStore';
import { diffEditModeOn, setDiffEditMode } from '@/features/pull-requests/editModeStore';
import { FOLD_MODE_LABEL, applyFoldMode, type FoldMode } from '@/features/pull-requests/foldModeStore';
import { stepRing } from '@/features/pull-requests/navColumn';

export interface WorkspaceCommandContext {
  showsDiff: boolean;
  files: string[];
  path: string | null;
  revealFile: (filename: string) => void;
  editable: boolean;
}

const LAYOUTS = Object.keys(DIFF_LAYOUT_LABEL) as DiffLayout[];
const FOLDS = Object.keys(FOLD_MODE_LABEL) as FoldMode[];
const SORTS = Object.keys(DIFF_SORT_LABEL) as DiffSort[];

export function workspaceCommands(context: WorkspaceCommandContext): Command[] {
  if (!context.showsDiff) return [];
  return [
    ...fileStepCommands(context),
    ...LAYOUTS.map((layout) => command(`diff.${layout}`, DIFF_LAYOUT_LABEL[layout], () => setDiffLayout(layout))),
    ...(context.editable ? [command('diff.editMode', 'Toggle edit mode', () => setDiffEditMode(!diffEditModeOn()))] : []),
    ...FOLDS.map((mode) => command(`fold.${mode}`, FOLD_MODE_LABEL[mode], () => applyFoldMode(mode))),
    ...SORTS.map((sort) => command(`sort.${sort}`, diffSortTitle(sort), () => setDiffSort(sort))),
  ];
}

function fileStepCommands({ files, path, revealFile }: WorkspaceCommandContext): Command[] {
  const step = (delta: number) => {
    const next = stepRing(files, path, delta);
    if (next !== null) revealFile(next);
  };
  return [command('file.prev', 'Previous changed file', () => step(-1)), command('file.next', 'Next changed file', () => step(1))];
}
