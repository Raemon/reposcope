'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ApiCallTreeTrigger } from './ApiCallTreeTooltip';
import { ApiPathOperations, callTreeRoot } from './ApiPathOperations';
import { ChainChevron, TreeBranchLabel, TreeLeafLabel, startsOpen } from './TreeRowLabel';
import { displayApiPath, type ApiEndpointGroup } from './apiEndpointGroups';
import { locationTarget } from '@/features/repo-insights/ui/surfaceIndex';

export function ApiEndpointTree({
  groups,
  methods,
  reveal,
}: {
  groups: ApiEndpointGroup[];
  methods: string[];
  reveal: string | null;
}) {
  return (
    <>
      {groups.map((group) => (
        <GroupRows key={group.path} group={group} methods={methods} depth={0} reveal={reveal} />
      ))}
    </>
  );
}

function GroupRows({
  group,
  methods,
  depth,
  reveal,
}: {
  group: ApiEndpointGroup;
  methods: string[];
  depth: number;
  reveal: string | null;
}) {
  const holdsReveal = groupHoldsReveal(group, reveal);
  const [open, setOpen] = useState(startsOpen(depth) || holdsReveal);
  const { chain, tail } = layerChain(group);
  const branch = tail.children.length > 0;
  const revealed = tail.endpoints.some((endpoint) => locationTarget(endpoint.code) === reveal);

  useEffect(() => {
    if (holdsReveal) setOpen(true);
  }, [holdsReveal]);

  const name = (
    <span className="flex min-w-0 items-center gap-1.5">
      {chain.map((layer, index) => (
        <Fragment key={layer.path}>
          {index > 0 ? <ChainChevron /> : null}
          <PathName group={layer} />
        </Fragment>
      ))}
    </span>
  );
  const label = branch ? (
    <TreeBranchLabel open={open} onToggle={() => setOpen((held) => !held)} depth={depth} label={tail.path}>
      {name}
    </TreeBranchLabel>
  ) : (
    <TreeLeafLabel depth={depth} glyph={depth === 0 ? '/' : '↳'}>{name}</TreeLeafLabel>
  );
  return (
    <>
      {tail.endpoints.length > 0 ? (
        <ApiPathOperations endpoints={tail.endpoints} methods={methods} label={label} revealed={revealed} />
      ) : (
        <PathLayerRow methods={methods} label={label} />
      )}
      {open && branch
        ? tail.children.map((child) => (
            <GroupRows key={child.path} group={child} methods={methods} depth={depth + 1} reveal={reveal} />
          ))
        : null}
    </>
  );
}

function layerChain(group: ApiEndpointGroup): { chain: ApiEndpointGroup[]; tail: ApiEndpointGroup } {
  const chain = [group];
  let tail = group;
  while (tail.endpoints.length === 0) {
    const lone = tail.children.length === 1 ? tail.children[0] : undefined;
    if (!lone) break;
    tail = lone;
    chain.push(tail);
  }
  return { chain, tail };
}

function groupHoldsReveal(group: ApiEndpointGroup, reveal: string | null): boolean {
  if (reveal === null) return false;
  return (
    group.endpoints.some((endpoint) => locationTarget(endpoint.code) === reveal) ||
    group.children.some((child) => groupHoldsReveal(child, reveal))
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
