'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collapseRegions, type CollapseRegion } from './collapseRegions';
import { rowOf } from './commentAnchors';
import type { EditableBlock } from './editableBlocks';
import { useFoldCommand, type FoldMode } from './foldModeStore';
import { innerRows } from './foldSpan';
import type { ReviewThread } from './reviewThreads';
import type { DiffRow } from './splitDiff';
import { treeCollapseRegions } from './treeSitterFolds';

export interface CollapseAnchor {
  region: CollapseRegion;
  collapsed: boolean;
  hiddenThreads: number;
  toggle: () => void;
}

export interface CodeCollapse {
  anchors: Map<number, CollapseAnchor>;
  hidden: Set<number>;
}

type Overrides = Record<string, boolean>;
type SetOverride = (changes: Overrides) => void;

const NO_OVERRIDES: Overrides = {};

export function useCodeCollapse(
  rows: DiffRow[],
  contiguous: boolean,
  filename: string,
  threads: ReviewThread[],
  edit: EditableBlock | null,
): CodeCollapse {
  const heuristic = useMemo(() => collapseRegions(rows, contiguous, filename), [rows, contiguous, filename]);
  const parsed = useTreeRegions(rows, contiguous, filename);
  const regions = parsed ?? heuristic;
  const threadRows = useMemo(() => threadRowIndexes(threads, rows), [threads, rows]);
  const command = useFoldCommand();
  const [overrides, setOverride] = useFoldOverrides(command.epoch);
  return useMemo(
    () => buildCollapse(regions, threadRows, edit, command.mode, overrides, setOverride),
    [regions, threadRows, edit, command.mode, overrides, setOverride],
  );
}

interface HeldOverrides {
  epoch: number;
  overrides: Overrides;
}

function overridesAt(held: HeldOverrides, epoch: number): Overrides {
  return held.epoch === epoch ? held.overrides : NO_OVERRIDES;
}

function useFoldOverrides(epoch: number): [Overrides, SetOverride] {
  const [held, setHeld] = useState<HeldOverrides>({ epoch, overrides: NO_OVERRIDES });
  const setOverride = useCallback<SetOverride>(
    (changes) => setHeld((was) => ({ epoch, overrides: { ...overridesAt(was, epoch), ...changes } })),
    [epoch],
  );
  return [overridesAt(held, epoch), setOverride];
}

interface TreeRegionsHeld {
  rows: DiffRow[];
  contiguous: boolean;
  filename: string;
  regions: CollapseRegion[];
}

function useTreeRegions(rows: DiffRow[], contiguous: boolean, filename: string): CollapseRegion[] | null {
  const [held, setHeld] = useState<TreeRegionsHeld | null>(null);
  useEffect(() => {
    let cancelled = false;
    treeCollapseRegions(rows, contiguous, filename)
      .then((regions) => {
        if (!cancelled && regions) setHeld({ rows, contiguous, filename, regions });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [rows, contiguous, filename]);
  if (!held || held.rows !== rows || held.contiguous !== contiguous || held.filename !== filename) return null;
  return held.regions;
}

function threadRowIndexes(threads: ReviewThread[], rows: DiffRow[]): Set<number> {
  const found = new Set<number>();
  for (const thread of threads) {
    const index = rowOf(thread, rows);
    if (index >= 0) found.add(index);
  }
  return found;
}

function buildCollapse(
  regions: CollapseRegion[],
  threadRows: Set<number>,
  edit: EditableBlock | null,
  mode: FoldMode,
  overrides: Overrides,
  setOverride: SetOverride,
): CodeCollapse {
  const anchors = new Map<number, CollapseAnchor>();
  const hidden = new Set<number>();
  const foldable = regions.filter((region) => !regionOverlapsEdit(region, edit));
  for (const region of foldable) {
    const hiddenThreads = innerRows(region).filter((row) => threadRows.has(row)).length;
    const collapsed = overrides[region.key] ?? modeCollapsed(region, hiddenThreads, mode);
    const toggle = () => setOverride(collapsed ? expansionFrom(foldable, region) : { [region.key]: true });
    anchors.set(region.start, { region, collapsed, hiddenThreads, toggle });
    if (collapsed) for (const row of innerRows(region)) hidden.add(row);
  }
  return { anchors, hidden };
}

function expansionFrom(foldable: CollapseRegion[], region: CollapseRegion): Overrides {
  const following = foldable.filter((other) => other.start >= region.start);
  return Object.fromEntries(following.map((other) => [other.key, false]));
}

// start < lastRow: the anchor row only bounds the block, and must keep its chevron.
function regionOverlapsEdit(region: CollapseRegion, edit: EditableBlock | null): boolean {
  return edit !== null && region.start < edit.lastRow && region.end >= edit.firstRow;
}

function modeCollapsed(region: CollapseRegion, hiddenThreads: number, mode: FoldMode): boolean {
  if (mode === 'expandAll' || mode === 'gitDefault') return false;
  if (mode === 'collapseAll') return true;
  return hiddenThreads === 0 && (region.imports || unchangedRegion(region));
}

function unchangedRegion(region: CollapseRegion): boolean {
  return region.addedLines === 0 && region.deletedLines === 0 && !region.anchorChanged;
}
