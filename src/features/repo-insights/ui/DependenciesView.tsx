'use client';

import { useState } from 'react';
import { Chip } from '@/features/surface-ui/Chip';
import { EmptyNote } from '@/features/surface-ui/EmptyNote';
import { FilterField, matchesFilter } from '@/features/surface-ui/FilterField';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import type { DependencyManifest } from '../insightTypes';

export function DependenciesView({ manifests }: { manifests: DependencyManifest[] }) {
  const [filter, setFilter] = useState('');
  const total = manifests.reduce((sum, manifest) => sum + manifest.entries.length, 0);
  return (
    <InsightSection
      id="dependencies"
      kicker="Declared in manifests"
      title="Dependencies"
      blurb="What this codebase leans on. Import counts show how deeply each package is woven in — a package imported in thirty files is architecture, one imported once is a utility."
      stat={`${total} packages across ${manifests.length} ${manifests.length === 1 ? 'manifest' : 'manifests'}`}
      as="h1"
    >
      <FilterField value={filter} onChange={setFilter} placeholder="filter packages…" />
      <div className="flex flex-wrap items-start gap-6">
        {manifests.map((manifest) => (
          <ManifestPanel key={manifest.file} manifest={manifest} filter={filter} />
        ))}
      </div>
      {total === 0 ? <EmptyNote>No dependency manifests were found.</EmptyNote> : null}
    </InsightSection>
  );
}

function ManifestPanel({ manifest, filter }: { manifest: DependencyManifest; filter: string }) {
  const shown = manifest.entries
    .filter((entry) => matchesFilter(filter, entry.name))
    .sort((left, right) =>
      Number(left.group === 'dev') - Number(right.group === 'dev') || right.usedIn - left.usedIn || left.name.localeCompare(right.name),
    );
  if (shown.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="mb-1.5 font-mono text-[10px] text-ink-dim">
        {manifest.file} · {manifest.ecosystem}
        {manifest.lockfile ? ` · locked (${manifest.lockfile})` : ' · no lockfile'}
      </p>
      <InsightPanel>
        <InsightTable
          caption={`Dependencies declared in ${manifest.file}`}
          columns={['Package', 'Version', 'Group', 'Imported in']}
        >
          {shown.map((entry) => (
            <tr key={`${entry.group} ${entry.name}`} className="border-b border-panel-edge last:border-b-0">
              <td className="py-1 pl-2 pr-3 font-mono text-[11px] leading-5 text-ink">{entry.name}</td>
              <td className="py-1 pr-3 font-mono text-[10px] text-ink-dim">{entry.version || '*'}</td>
              <td className="py-1 pr-3">{entry.group === 'dev' ? <Chip>dev</Chip> : <Chip tone="accent">runtime</Chip>}</td>
              <td className="py-1 pr-2 text-right font-mono text-[10px] text-ink-dim">
                {entry.usedIn > 0 ? `${entry.usedIn} ${entry.usedIn === 1 ? 'file' : 'files'}` : '—'}
              </td>
            </tr>
          ))}
        </InsightTable>
      </InsightPanel>
    </div>
  );
}
