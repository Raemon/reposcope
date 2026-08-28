'use client';

import { useMemo, useState } from 'react';
import { collapseRegions, type CollapseRegion } from './collapseRegions';
import type { EditableBlock } from './editableBlocks';
import type { ReviewThread } from './reviewThreads';
import type { DiffRow } from './splitDiff';

export interface CollapseAnchor {
  collapsed: boolean;
  hiddenLines: number;
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
  threads: ReviewThread[],
  edit: EditableBlock | null,
): CodeCollapse {
  const regions = useMemo(() => collapseRegions(rows, contiguous), [rows, contiguous]);
  const threadRows = useMemo(() => threadRowIndexes(threads, rows), [threads, rows]);
  const [overrides, setOverrides] = useState<Overrides>({});
  return useMemo(
    () => buildCollapse(regions, threadRows, edit, overrides, setOverrides),
    [regions, threadRows, edit, overrides],
  );
}

function threadRowIndexes(threads: ReviewThread[], rows: DiffRow[]): Set<number> {
  const found = new Set<number>();
  for (const thread of threads) {
    const index = rows.findIndex((row) => thread.line !== null && row[thread.side]?.line === thread.line);
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
    const collapsed = isCollapsed(region, threadRows, edit, overrides);
    anchors.set(region.start, anchorFor(region, collapsed, setOverrides));
    if (collapsed) for (let row = region.start + 1; row <= region.end; row += 1) hidden.add(row);
  }
  return { anchors, hidden };
}

function anchorFor(region: CollapseRegion, collapsed: boolean, setOverrides: SetOverrides): CollapseAnchor {
  return {
    collapsed,
    hiddenLines: region.end - region.start,
    toggle: () => setOverrides((held) => ({ ...held, [region.key]: !collapsed })),
  };
}

function isCollapsed(
  region: CollapseRegion,
  threadRows: Set<number>,
  edit: EditableBlock | null,
  overrides: Overrides,
): boolean {
  if (edit && region.start <= edit.lastRow && region.end >= edit.firstRow) return false;
  return overrides[region.key] ?? defaultCollapsed(region, threadRows);
}

function defaultCollapsed(region: CollapseRegion, threadRows: Set<number>): boolean {
  if (!region.imports || region.hasChanges) return false;
  for (let row = region.start + 1; row <= region.end; row += 1) if (threadRows.has(row)) return false;
  return true;
}
