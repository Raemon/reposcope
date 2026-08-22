'use client';

import { useState, type ReactNode } from 'react';
import { ApiCallTreeTrigger } from './ApiCallTreeTooltip';
import { ApiPathOperations, callTreeRoot } from './ApiPathOperations';
import { TreeBranchLabel, TreeLeafLabel, startsOpen } from './TreeRowLabel';
import { displayApiPath, type ApiEndpointGroup } from './apiEndpointGroups';

export function ApiEndpointTree({ groups, methods }: { groups: ApiEndpointGroup[]; methods: string[] }) {
  return (
    <>
      {groups.map((group) => <GroupRows key={group.path} group={group} methods={methods} depth={0} />)}
    </>
  );
}

function GroupRows({ group, methods, depth }: { group: ApiEndpointGroup; methods: string[]; depth: number }) {
  const [open, setOpen] = useState(startsOpen(depth));
  const branch = group.children.length > 0;
  const name = <PathName group={group} />;
  const label = branch ? (
    <TreeBranchLabel open={open} onToggle={() => setOpen((held) => !held)} depth={depth} label={group.path}>
      {name}
    </TreeBranchLabel>
  ) : (
    <TreeLeafLabel depth={depth} glyph={depth === 0 ? '/' : '↳'}>{name}</TreeLeafLabel>
  );
  return (
    <>
      {group.endpoints.length > 0 ? (
        <ApiPathOperations endpoints={group.endpoints} methods={methods} label={label} />
      ) : (
        <PathLayerRow methods={methods} label={label} />
      )}
      {open && branch
        ? group.children.map((child) => <GroupRows key={child.path} group={child} methods={methods} depth={depth + 1} />)
        : null}
    </>
  );
}

function PathName({ group }: { group: ApiEndpointGroup }) {
  if (group.endpoints.length === 0) return <code className="truncate text-[11px]">{displayApiPath(group.path)}</code>;
  return (
    <ApiCallTreeTrigger label={group.path} roots={group.endpoints.map(callTreeRoot)} className="min-w-0">
      <code className="truncate text-[11px] text-ink">{displayApiPath(group.path)}</code>
    </ApiCallTreeTrigger>
  );
}

function PathLayerRow({ methods, label }: { methods: string[]; label: ReactNode }) {
  return (
    <tr className="border-b border-panel-edge/70 bg-bg/20 text-ink-dim last:border-b-0">
      <th scope="row" className="h-7 whitespace-nowrap py-0 pl-2 pr-2.5 text-left font-normal">{label}</th>
      {methods.map((method) => <td key={method} />)}
    </tr>
  );
}
