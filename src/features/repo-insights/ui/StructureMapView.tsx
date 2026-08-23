'use client';

import { useEffect, useState } from 'react';
import { TreeBranchLabel, TreeLeafLabel } from '@/features/api-surface/TreeRowLabel';
import { Chip } from './Chip';
import { InsightPanel, InsightSection } from './InsightSection';
import { MeterBar } from './MeterBar';
import { SourceRef } from './SourceRef';
import { locationTarget, targetHoldsPath } from './surfaceIndex';
import type { MapNode } from '../insightTypes';

const REVEALED_ROW = 'rounded-sm bg-procgen px-1 ring-1 ring-accent';

export function StructureMapView({ map, reveal }: { map: MapNode; reveal: string | null }) {
  return (
    <InsightSection
      id="structure-map"
      kicker="Every file, whatever the language"
      title="Map"
      blurb="The shape of the repository: which directories hold the weight, what languages they are written in, and the symbols each one defines."
      stat={`${map.files} files · ${map.codeLines.toLocaleString()} lines of code`}
      as="h1"
    >
      <InsightPanel className="px-2 py-1.5">
        {map.gloss ? <p className="mb-1.5 max-w-xl px-1 text-xs leading-5 text-ink-dim">{map.gloss}</p> : null}
        <MapNodeRows node={map} depth={0} reveal={reveal} />
      </InsightPanel>
    </InsightSection>
  );
}

function MapNodeRows({ node, depth, reveal }: { node: MapNode; depth: number; reveal: string | null }) {
  return (
    <>
      {node.children.map((child) => <MapBranch key={child.path} node={child} depth={depth} reveal={reveal} />)}
      {node.symbols.map((symbol) => {
        const revealed = locationTarget(symbol.at) === reveal;
        return (
          <TreeLeafLabel key={locationTarget(symbol.at)} depth={depth} glyph="·">
            <span
              data-reveal={revealed ? 'true' : undefined}
              className={`flex items-baseline gap-2 py-0.5 ${revealed ? REVEALED_ROW : ''}`}
            >
              <Chip>{symbol.kind}</Chip>
              <span className="font-mono text-[11px] text-ink">{symbol.name}</span>
              <SourceRef at={symbol.at} />
            </span>
          </TreeLeafLabel>
        );
      })}
    </>
  );
}

function MapBranch({ node, depth, reveal }: { node: MapNode; depth: number; reveal: string | null }) {
  const [open, setOpen] = useState(depth === 0 || targetHoldsPath(reveal, node.path));

  useEffect(() => {
    if (targetHoldsPath(reveal, node.path)) setOpen(true);
  }, [reveal, node.path]);

  const hasContents = node.children.length > 0 || node.symbols.length > 0;
  const revealed = node.path === reveal;
  const label = (
    <span
      data-reveal={revealed ? 'true' : undefined}
      className={`flex min-w-0 items-baseline gap-2 py-0.5 ${revealed ? REVEALED_ROW : ''}`}
    >
      <span className="font-mono text-[11px] text-accent">{node.name}/</span>
      <span className="whitespace-nowrap font-mono text-[10px] text-ink-dim">
        {node.files} {node.files === 1 ? 'file' : 'files'}{node.codeLines > 0 ? ` · ${node.codeLines.toLocaleString()} loc` : ''}
      </span>
      <MeterBar
        width="w-16"
        segments={node.languages.map((held) => ({
          label: held.language,
          value: held.lines || held.files,
          detail: `${held.language}: ${held.files} ${held.files === 1 ? 'file' : 'files'}, ${held.lines.toLocaleString()} lines`,
        }))}
      />
      {node.gloss ? <span className="hidden max-w-64 truncate text-[10px] text-ink-dim sm:inline">{node.gloss}</span> : null}
    </span>
  );
  if (!hasContents) {
    return <TreeLeafLabel depth={depth} glyph="▪">{label}</TreeLeafLabel>;
  }
  return (
    <>
      <TreeBranchLabel open={open} onToggle={() => setOpen(!open)} depth={depth} label={node.path}>
        {label}
      </TreeBranchLabel>
      {open ? <MapNodeRows node={node} depth={depth + 1} reveal={reveal} /> : null}
    </>
  );
}
