'use client';

import { Fragment, useState } from 'react';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { ChainChevron, NESTED_GLYPH, TreeBranchLabel, TreeLeafLabel } from '@/features/surface-ui/TreeRowLabel';
import type { AppRoute, AppRouteApiCall, AppRouteComponent } from './appRouteCatalog';

export function AppRouteTree({ routes }: { routes: AppRoute[] }) {
  return (
    <>
      {routes.map((route) => <RouteRows key={`${route.path}:${route.file}`} route={route} />)}
    </>
  );
}

function RouteRows({ route }: { route: AppRoute }) {
  const [open, setOpen] = useState(true);
  const { chain, tail } = componentChain(route.component);
  const children = tail.children;
  const name = (
    <span className="flex min-w-0 items-center gap-1.5">
      <code className="truncate text-[11px] text-ink">{route.path}</code>
      {chain.map((component, index) => (
        <Fragment key={index}>
          <ChainChevron />
          <ComponentName component={component} />
        </Fragment>
      ))}
    </span>
  );
  return (
    <>
      <tr className="border-b border-panel-edge/70 bg-btn/18">
        <th scope="row" className="h-7 whitespace-nowrap py-0 pl-2 pr-2.5 text-left font-normal">
          {children.length > 0 ? (
            <TreeBranchLabel
              open={open}
              onToggle={() => setOpen((held) => !held)}
              depth={0}
              label={[route.path, ...chain.map((component) => component.name)].join(' › ')}
            >
              {name}
            </TreeBranchLabel>
          ) : (
            <TreeLeafLabel depth={0} glyph="/">{name}</TreeLeafLabel>
          )}
        </th>
        <CallChipsCell calls={chainCalls(chain)} />
      </tr>
      {open
        ? children.map((component) => (
          <AppRouteComponentRow key={`${component.file}:${component.name}`} component={component} depth={1} />
        ))
        : null}
    </>
  );
}

function AppRouteComponentRow({
  component,
  depth,
}: {
  component: AppRouteComponent;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  const { chain, tail } = componentChain(component);
  const branch = tail.children.length > 0;
  const name = (
    <span className="flex min-w-0 items-center gap-1.5">
      {chain.map((held, index) => (
        <Fragment key={index}>
          {index > 0 ? <ChainChevron /> : null}
          <ComponentName component={held} />
        </Fragment>
      ))}
    </span>
  );
  return (
    <>
      <tr className="border-b border-panel-edge/70 last:border-b-0">
        <td className="h-7 whitespace-nowrap py-0 pl-2 pr-2 align-middle">
          {branch ? (
            <TreeBranchLabel
              open={open}
              onToggle={() => setOpen((held) => !held)}
              depth={depth}
              label={chain.map((held) => held.name).join(' › ')}
            >
              {name}
            </TreeBranchLabel>
          ) : (
            <TreeLeafLabel depth={depth} glyph={NESTED_GLYPH}>{name}</TreeLeafLabel>
          )}
        </td>
        <CallChipsCell calls={chainCalls(chain)} />
      </tr>
      {open && branch
        ? tail.children.map((child) => (
          <AppRouteComponentRow key={`${child.file}:${child.name}`} component={child} depth={depth + 1} />
        ))
        : null}
    </>
  );
}

function componentChain(component: AppRouteComponent): { chain: AppRouteComponent[]; tail: AppRouteComponent } {
  const chain = [component];
  let tail = component;
  while (true) {
    const lone = tail.children.length === 1 ? tail.children[0] : undefined;
    if (!lone) break;
    tail = lone;
    chain.push(tail);
  }
  return { chain, tail };
}

function chainCalls(chain: AppRouteComponent[]): AppRouteApiCall[] {
  const seen = new Map<string, AppRouteApiCall>();
  for (const component of chain) {
    for (const call of component.calls) seen.set(callKey(call), call);
  }
  return [...seen.values()];
}

function ComponentName({ component }: { component: AppRouteComponent }) {
  return (
    <HoverCardTrigger
      label={`${component.file}:${component.line}`}
      card={<ComponentCard component={component} />}
      className="min-w-0"
    >
      <code className="truncate text-[11px] text-ink">{component.name}</code>
    </HoverCardTrigger>
  );
}

function CallChipsCell({ calls }: { calls: AppRouteApiCall[] }) {
  return (
    <td className="h-7 py-0 pl-3 pr-2 align-middle">
      {calls.length > 0 ? (
        <div className="flex max-w-[26rem] flex-wrap items-center gap-x-2">
          {calls.map((call) => <CallChip key={callKey(call)} call={call} />)}
        </div>
      ) : null}
    </td>
  );
}

function CallChip({ call }: { call: AppRouteApiCall }) {
  return (
    <span className="whitespace-nowrap font-mono text-[10px] leading-4 text-ink-dim">
      <span className="text-accent opacity-70">{call.method}</span> {shortPath(call.path)}
    </span>
  );
}

function ComponentCard({ component }: { component: AppRouteComponent }) {
  return (
    <>
      <p className="mb-1 text-[9px] uppercase tracking-[0.14em] text-ink-dim">
        {component.children.length} rendered {component.children.length === 1 ? 'child' : 'children'}
      </p>
      {component.calls.length === 0 ? (
        <p className="font-mono text-[10px] leading-4 text-ink-dim">calls no API</p>
      ) : (
        component.calls.map((call) => (
          <div key={callKey(call)} className="font-mono text-[10px] leading-4 text-ink">
            <span className="text-accent opacity-80">{call.method}</span> {call.path}
            <span className="ml-1.5 text-ink-dim">via {call.through}</span>
          </div>
        ))
      )}
    </>
  );
}

function shortPath(path: string): string {
  return path.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
}

function callKey(call: AppRouteApiCall): string {
  return `${call.method} ${call.path}`;
}
