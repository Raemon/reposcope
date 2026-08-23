'use client';

import { useState } from 'react';
import { Chip } from '@/features/surface-ui/Chip';
import { EmptyNote } from '@/features/surface-ui/EmptyNote';
import { FilterField, matchesFilter } from '@/features/surface-ui/FilterField';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import { LabeledPanel } from '@/features/surface-ui/LabeledPanel';
import { SourceRef } from '@/features/surface-ui/SourceRef';
import { shortFile } from '@/features/surface-ui/sourceLocation';
import type { SchemaFileGroup, SchemaModel, SchemaSurface } from '../insightTypes';

export function SchemaView({ schema }: { schema: SchemaSurface }) {
  const { files, models } = schema;
  const [filter, setFilter] = useState('');
  const kinds = [...new Set(models.map((model) => model.kind))];
  const most = Math.max(1, ...models.map((model) => model.callsites));
  const shown = models.filter((model) => matchesFilter(filter, model.name));
  const stored = models.filter((model) => model.storedIn !== null);
  const storedNote = stored.length > 0 ? ` · ${stored.length} document types stored as JSON in ${[...new Set(stored.map((model) => model.storedIn))].join(', ')}` : '';
  return (
    <InsightSection
      id="schema"
      kicker="Tables, models, and types"
      title="The schema"
      blurb="What this codebase stores, ordered by how hard the rest of the code leans on each table. Reference counts are name matches outside tests, migrations, and each model's own definition — a rough but honest measure of which nouns carry the application."
      stat={`${models.length} models · ${kinds.join(', ')}${storedNote}`}
      as="h1"
    >
      {files.length > 0 ? (
        <LabeledPanel label="where the schema lives" className="mb-4">
          <InsightTable caption="Files identified as schema definitions" columns={['Location', 'Kind', 'Files', 'Models']}>
            {files.map((group) => (
              <SchemaFileRow key={`${group.label} ${group.kind}`} group={group} />
            ))}
          </InsightTable>
        </LabeledPanel>
      ) : null}
      <FilterField value={filter} onChange={setFilter} placeholder="filter models…" />
      <div className="flex flex-wrap items-start gap-4">
        {shown.map((model) => (
          <ModelPanel key={`${model.kind} ${model.name}`} model={model} most={most} />
        ))}
      </div>
      {models.length === 0 ? <EmptyNote>No schema definitions were detected.</EmptyNote> : null}
    </InsightSection>
  );
}

function SchemaFileRow({ group }: { group: SchemaFileGroup }) {
  return (
    <tr className="border-b border-panel-edge last:border-b-0">
      <td className="py-1 pl-2 pr-3 font-mono text-[11px] leading-5 text-ink">
        <HoverCardTrigger label={group.label} card={<p className="max-w-72 text-[11px] leading-4 text-ink">{group.signal}</p>}>
          <span>{group.label}</span>
        </HoverCardTrigger>
      </td>
      <td className="py-1 pr-3"><Chip>{group.kind}</Chip></td>
      <td className="py-1 pr-3 text-right font-mono text-[10px] text-ink-dim">{group.files}</td>
      <td className="py-1 pr-2 text-right font-mono text-[10px] text-ink-dim">{group.models > 0 ? group.models : '—'}</td>
    </tr>
  );
}

function ModelPanel({ model, most }: { model: SchemaModel; most: number }) {
  return (
    <InsightPanel className="min-w-52">
      <div className="flex items-center gap-2 border-b border-panel-edge px-2 py-1.5">
        <span className="font-mono text-[12px] text-accent">{model.name}</span>
        <Chip>{model.kind}</Chip>
        <SourceRef at={model.at} />
      </div>
      <div className="flex items-center gap-2 border-b border-panel-edge px-2 py-1.5">
        <span className="inline-flex h-1.5 w-24 overflow-hidden rounded-sm border border-btn-edge bg-btn">
          <span className="h-full bg-meter-2" style={{ width: `${Math.max(2, (model.callsites / most) * 100)}%` }} />
        </span>
        <CallsiteNote model={model} />
        {model.storedIn ? <span className="font-mono text-[10px] text-ink-dim">in {model.storedIn}</span> : null}
      </div>
      {model.fields.length > 0 ? (
        <div className="px-2 py-1.5">
          {model.fields.map((field) => (
            <p key={field.name} className="flex justify-between gap-4 py-px font-mono text-[11px] leading-4">
              <span className="text-ink">{field.name}</span>
              <span className="text-ink-dim">{field.type}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="px-2 py-1.5 text-[10px] text-ink-dim">fields not statically visible</p>
      )}
    </InsightPanel>
  );
}

function CallsiteNote({ model }: { model: SchemaModel }) {
  const label =
    model.callsites === 0
      ? 'no references found'
      : `${model.callsites} ${model.callsites === 1 ? 'ref' : 'refs'} in ${model.callsiteFiles} ${model.callsiteFiles === 1 ? 'file' : 'files'}`;
  if (model.sites.length === 0) {
    return <span className="font-mono text-[10px] text-ink-dim">{label}</span>;
  }
  return (
    <HoverCardTrigger
      label={`references to ${model.name}`}
      card={
        <div className="max-w-96">
          {model.sites.map((site) => (
            <p key={`${site.file}:${site.line}`} className="py-0.5 font-mono text-[10px] leading-4">
              <span className="text-ink-dim">{shortFile(site.file)}:{site.line}</span>{' '}
              <span className="text-ink">{site.excerpt}</span>
            </p>
          ))}
          {model.callsiteFiles > model.sites.length ? (
            <p className="pt-1 text-[10px] text-ink-dim">…and {model.callsiteFiles - model.sites.length} more files</p>
          ) : null}
        </div>
      }
    >
      <span className="font-mono text-[10px] text-ink-dim">{label}</span>
    </HoverCardTrigger>
  );
}
