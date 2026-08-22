'use client';

import { useState } from 'react';
import { HoverCardTrigger } from './HoverCard';
import { TreeBranchLabel, TreeLeafLabel, startsOpen } from './TreeRowLabel';
import type { AppRoute, AppRouteApiCall, AppRouteComponent } from './appRouteCatalog';

export function AppRouteTree({ routes }: { routes: AppRoute[] }) {
  return (
    <>
      {routes.map((route) => <RouteRows key={`${route.path}:${route.file}`} route={route} />)}
    </>
  );
}

function RouteRows({ route }: { route: AppRoute }) {
  const [open, setOpen] = useState(startsOpen(0));
  const name = <code className="truncate text-[11px] text-ink">{route.path}</code>;
  return (
    <>
      <tr className="border-b border-panel-edge/70 bg-btn/18">
        <th scope="row" className="h-7 whitespace-nowrap py-0 pl-2 pr-2.5 text-left font-normal">
          {route.components.length > 0 ? (
            <TreeBranchLabel open={open} onToggle={() => setOpen((held) => !held)} depth={0} label={route.path}>
              {name}
            </TreeBranchLabel>
          ) : (
            <TreeLeafLabel depth={0} glyph="/">{name}</TreeLeafLabel>
          )}
        </th>
        <td />
      </tr>
      {open
        ? route.components.map((component) => (
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
  const [open, setOpen] = useState(startsOpen(depth));
  const name = (
    <HoverCardTrigger
      label={`${component.file}:${component.line}`}
      card={<ComponentCard component={component} />}
      className="min-w-0"
    >
      <code className="truncate text-[11px] text-ink">{component.name}</code>
    </HoverCardTrigger>
  );
  return (
    <>
      <tr className="border-b border-panel-edge/70 last:border-b-0">
        <td className="h-7 whitespace-nowrap py-0 pl-2 pr-2 align-middle">
          {component.children.length > 0 ? (
            <TreeBranchLabel open={open} onToggle={() => setOpen((held) => !held)} depth={depth} label={component.name}>
              {name}
            </TreeBranchLabel>
          ) : (
            <TreeLeafLabel depth={depth} glyph="↳">{name}</TreeLeafLabel>
          )}
        </td>
        <td className="h-7 py-0 pl-3 pr-2 align-middle">
          <div className="flex max-w-[26rem] flex-wrap items-center gap-x-2">
            {component.calls.map((call) => <CallChip key={callKey(call)} call={call} />)}
          </div>
        </td>
      </tr>
      {open
        ? component.children.map((child) => (
          <AppRouteComponentRow key={`${child.file}:${child.name}`} component={child} depth={depth + 1} />
        ))
        : null}
    </>
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
