'use client';

import { useEffect, useMemo, useState } from 'react';
import { collapseRegions, type CollapseRegion } from './collapseRegions';
import { rowOf } from './commentAnchors';
import type { EditableBlock } from './editableBlocks';
import type { ReviewThread } from './reviewThreads';
import type { DiffRow } from './splitDiff';
import { treeCollapseRegions } from './treeSitterFolds';

export interface CollapseAnchor {
  collapsed: boolean;
  hiddenLines: number;
  hiddenThreads: number;
  kind: string;
  depth: number;
  toggle: () => void;
}

export interface CodeCollapse {
  anchors: Map<number, CollapseAnchor>;
  hidden: Set<number>;
}

type Overrides = Record<string, boolean>;
type SetOverrides = (update: (held: Overrides) => Overrides) => void;

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
  const [overrides, setOverrides] = useState<Overrides>({});
  return useMemo(
    () => buildCollapse(regions, threadRows, edit, overrides, setOverrides),
    [regions, threadRows, edit, overrides],
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
  overrides: Overrides,
  setOverrides: SetOverrides,
): CodeCollapse {
  const anchors = new Map<number, CollapseAnchor>();
  const hidden = new Set<number>();
  for (const region of regions) {
    if (edit && region.start <= edit.lastRow && region.end >= edit.firstRow) continue;
    const collapsed = overrides[region.key] ?? defaultCollapsed(region, threadRows);
    anchors.set(region.start, anchorFor(region, collapsed, hiddenThreadCount(region, threadRows), setOverrides));
    if (collapsed) for (let row = region.start + 1; row <= region.end; row += 1) hidden.add(row);
  }
  return { anchors, hidden };
}

function anchorFor(region: CollapseRegion, collapsed: boolean, hiddenThreads: number, setOverrides: SetOverrides): CollapseAnchor {
  return {
    collapsed,
    hiddenLines: region.end - region.start,
    hiddenThreads,
    kind: region.kind,
    depth: region.depth,
    toggle: () => setOverrides((held) => ({ ...held, [region.key]: !collapsed })),
  };
}

function defaultCollapsed(region: CollapseRegion, threadRows: Set<number>): boolean {
  return region.imports && !region.hasChanges && hiddenThreadCount(region, threadRows) === 0;
}

function hiddenThreadCount(region: CollapseRegion, threadRows: Set<number>): number {
  let count = 0;
  for (let row = region.start + 1; row <= region.end; row += 1) if (threadRows.has(row)) count += 1;
  return count;
}
