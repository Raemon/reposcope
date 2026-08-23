'use client';

import { useState } from 'react';
import { Chip, MethodChip } from '@/features/surface-ui/Chip';
import { EmptyNote } from '@/features/surface-ui/EmptyNote';
import { FilterField, matchesFilter } from '@/features/surface-ui/FilterField';
import { InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import { LabeledPanel } from '@/features/surface-ui/LabeledPanel';
import { SourceRef } from '@/features/surface-ui/SourceRef';
import type { EntryPoint, EntryPointKind } from '../insightTypes';

const KIND_TITLES: Record<EntryPointKind, string> = {
  http: 'HTTP routes',
  websocket: 'WebSockets',
  graphql: 'GraphQL fields',
  cli: 'CLI commands',
};

export function EntryPointsView({ entryPoints, deepCount }: { entryPoints: EntryPoint[]; deepCount: number }) {
  const [filter, setFilter] = useState('');
  const shown = entryPoints.filter((entry) =>
    matchesFilter(filter, entry.name, entry.method, entry.framework, entry.language, entry.at.file),
  );
  const kinds = (['http', 'websocket', 'graphql', 'cli'] as const).filter((kind) =>
    shown.some((entry) => entry.kind === kind),
  );
  const frameworks = [...new Set(entryPoints.map((entry) => entry.framework))];
  return (
    <InsightSection
      id="entry-points"
      kicker="Recognized across languages"
      title="Entry points"
      blurb="Every way into this codebase that pattern analysis could find: HTTP routes, sockets, GraphQL fields, and CLI commands, each linked to the line that declares it."
      stat={`${entryPoints.length} found · ${frameworks.join(', ') || 'no frameworks'}${deepCount > 0 ? ` · ${deepCount} more traced in the API surface view` : ''}`}
      as="h1"
    >
      <FilterField value={filter} onChange={setFilter} placeholder="filter by path, method, framework…" />
      {shown.length === 0 ? <EmptyNote>Nothing matches this filter.</EmptyNote> : null}
      <div className="flex flex-wrap items-start gap-6">
        {kinds.map((kind) => (
          <EntryPointGroup key={kind} title={KIND_TITLES[kind]} entries={shown.filter((entry) => entry.kind === kind)} />
        ))}
      </div>
    </InsightSection>
  );
}

function EntryPointGroup({ title, entries }: { title: string; entries: EntryPoint[] }) {
  return (
    <LabeledPanel label={<>{title} · {entries.length}</>} className="min-w-0">
      <InsightTable caption={title} columns={['Method', 'Name', 'Framework', 'Declared at']}>
        {entries.map((entry) => (
          <tr key={`${entry.method} ${entry.name} ${entry.at.file}`} className="border-b border-panel-edge last:border-b-0">
            <td className="py-1 pl-2 pr-2 align-top"><MethodChip method={entry.method} /></td>
            <td className="py-1 pr-3 align-top font-mono text-[11px] leading-5 text-ink">{entry.name}</td>
            <td className="py-1 pr-3 align-top">
              <Chip tip={<p className="text-[11px] text-ink">{entry.language} · matched as a {entry.framework} declaration</p>} tipLabel={entry.framework}>
                {entry.framework}
              </Chip>
            </td>
            <td className="py-1 pr-2 align-top"><SourceRef at={entry.at} /></td>
          </tr>
        ))}
      </InsightTable>
    </LabeledPanel>
  );
}
