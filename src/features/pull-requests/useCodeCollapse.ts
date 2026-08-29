'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collapseRegions, type CollapseRegion } from './collapseRegions';
import { rowOf } from './commentAnchors';
import type { EditableBlock } from './editableBlocks';
import { useFoldCommand, type FoldMode } from './foldModeStore';
import type { ReviewThread } from './reviewThreads';
import type { DiffRow } from './splitDiff';
import { treeCollapseRegions } from './treeSitterFolds';

export interface CollapseAnchor {
  collapsed: boolean;
  hiddenLines: number;
  hiddenThreads: number;
  addedLines: number;
  deletedLines: number;
  kind: string;
  depth: number;
  toggle: () => void;
}

export interface CodeCollapse {
  anchors: Map<number, CollapseAnchor>;
  hidden: Set<number>;
}

type Overrides = Record<string, boolean>;
type SetOverride = (key: string, collapsed: boolean) => void;

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
  const [held, setHeld] = useState<{ epoch: number; overrides: Overrides }>({ epoch: 0, overrides: {} });
  const setOverride = useCallback<SetOverride>(
    (key, collapsed) => {
      setHeld((was) => ({
        epoch: command.epoch,
        overrides: { ...(was.epoch === command.epoch ? was.overrides : {}), [key]: collapsed },
      }));
    },
    [command.epoch],
  );
  const overrides = held.epoch === command.epoch ? held.overrides : {};
  return useMemo(
    () => buildCollapse(regions, threadRows, edit, command.mode, overrides, setOverride),
    [regions, threadRows, edit, command.mode, overrides, setOverride],
  );
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
  for (const region of regions) {
    if (edit && region.start <= edit.lastRow && region.end >= edit.firstRow) continue;
    const collapsed = overrides[region.key] ?? modeCollapsed(region, threadRows, mode);
    anchors.set(region.start, anchorFor(region, collapsed, hiddenThreadCount(region, threadRows), setOverride));
    if (collapsed) for (let row = region.start + 1; row <= region.end; row += 1) hidden.add(row);
  }
  return { anchors, hidden };
}

function modeCollapsed(region: CollapseRegion, threadRows: Set<number>, mode: FoldMode): boolean {
  if (mode === 'expandAll') return false;
  if (mode === 'collapseAll') return true;
  if (mode === 'collapseUnchanged' && unchangedRegion(region) && hiddenThreadCount(region, threadRows) === 0) return true;
  return defaultCollapsed(region, threadRows);
}

function unchangedRegion(region: CollapseRegion): boolean {
  return region.addedLines === 0 && region.deletedLines === 0;
}

function anchorFor(region: CollapseRegion, collapsed: boolean, hiddenThreads: number, setOverride: SetOverride): CollapseAnchor {
  return {
    collapsed,
    hiddenLines: region.end - region.start,
    hiddenThreads,
    addedLines: region.addedLines,
    deletedLines: region.deletedLines,
    kind: region.kind,
    depth: region.depth,
    toggle: () => setOverride(region.key, !collapsed),
  };
}

function defaultCollapsed(region: CollapseRegion, threadRows: Set<number>): boolean {
  return region.imports && hiddenThreadCount(region, threadRows) === 0;
}

function hiddenThreadCount(region: CollapseRegion, threadRows: Set<number>): number {
  let count = 0;
  for (let row = region.start + 1; row <= region.end; row += 1) if (threadRows.has(row)) count += 1;
  return count;
}
