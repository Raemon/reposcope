'use client';

import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { Chip } from '@/features/surface-ui/Chip';
import { InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import { LabeledPanel } from '@/features/surface-ui/LabeledPanel';
import { SourceRef } from '@/features/surface-ui/SourceRef';
import type { EnvVarUse, RunnableScript, RuntimeSurface } from '../insightTypes';

export function RuntimeView({ runtime }: { runtime: RuntimeSurface }) {
  const undocumented = runtime.envVars.filter((held) => !held.documented && held.sites.length > 0).length;
  return (
    <InsightSection
      id="runtime"
      kicker="Read from the code and config"
      title="Runtime"
      blurb="Everything this codebase expects from the world around it: environment variables, ports, runnable scripts, CI workflows, and containers. The usual blind spot when the code was written faster than it was read."
      stat={`${runtime.envVars.length} env vars${undocumented > 0 ? ` (${undocumented} undocumented)` : ''} · ${runtime.ports.length} ports · ${runtime.scripts.length} scripts · ${runtime.workflows.length} workflows`}
      as="h1"
    >
      <div className="flex flex-wrap items-start gap-6">
        {runtime.envVars.length > 0 ? <EnvVarsPanel envVars={runtime.envVars} /> : null}
        {runtime.scripts.length > 0 ? <ScriptsPanel scripts={runtime.scripts} /> : null}
        <SidePanels runtime={runtime} />
      </div>
    </InsightSection>
  );
}

function EnvVarsPanel({ envVars }: { envVars: EnvVarUse[] }) {
  return (
    <LabeledPanel label="Environment variables" className="min-w-0">
      <InsightTable caption="Environment variables the code reads" columns={['Name', 'Documented', 'Read at']}>
        {envVars.map((held) => (
          <tr key={held.name} className="border-b border-panel-edge last:border-b-0">
            <td className="py-1 pl-2 pr-3 font-mono text-[11px] leading-5 text-ink">{held.name}</td>
            <td className="py-1 pr-3">
              {held.documented ? (
                <Chip tip={<p className="text-[11px] text-ink">Listed in an .env example file</p>} tipLabel={held.name}>documented</Chip>
              ) : held.sites.length > 0 ? (
                <Chip tone="accent" tip={<p className="text-[11px] text-ink">Read by the code but absent from every .env example file</p>} tipLabel={held.name}>undocumented</Chip>
              ) : null}
            </td>
            <td className="py-1 pr-2">
              <span className="flex flex-wrap gap-x-2">
                {held.sites.length === 0 ? <span className="font-mono text-[10px] text-ink-dim">declared only</span> : null}
                {held.sites.map((site) => <SourceRef key={`${site.file}:${site.line}`} at={site} />)}
              </span>
            </td>
          </tr>
        ))}
      </InsightTable>
    </LabeledPanel>
  );
}

function ScriptsPanel({ scripts }: { scripts: RunnableScript[] }) {
  return (
    <LabeledPanel label="Runnable scripts" className="min-w-0">
      <InsightTable caption="Scripts defined by the repository" columns={['Name', 'Command']}>
        {scripts.map((script) => (
          <tr key={`${script.file} ${script.name}`} className="border-b border-panel-edge last:border-b-0">
            <td className="py-1 pl-2 pr-3 align-top font-mono text-[11px] leading-5 text-accent">
              <HoverCardTrigger label={script.file} card={<p className="font-mono text-[11px] text-ink">defined in {script.file}</p>}>
                <span>{script.name}</span>
              </HoverCardTrigger>
            </td>
            <td className="max-w-96 py-1 pr-2 align-top font-mono text-[10px] leading-5 text-ink-dim">
              <span className="line-clamp-2">{script.command}</span>
            </td>
          </tr>
        ))}
      </InsightTable>
    </LabeledPanel>
  );
}

function SidePanels({ runtime }: { runtime: RuntimeSurface }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {runtime.ports.length > 0 ? (
        <LabeledPanel label="Ports" panelClassName="px-2 py-1.5">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {runtime.ports.map((held) => (
              <span key={held.port} className="flex items-baseline gap-1.5">
                <span className="font-mono text-[11px] text-ink">:{held.port}</span>
                <SourceRef at={held.at} />
              </span>
            ))}
          </span>
        </LabeledPanel>
      ) : null}
      {runtime.workflows.length > 0 ? (
        <LabeledPanel label="CI workflows" panelClassName="px-2 py-1.5">
          {runtime.workflows.map((workflow) => (
            <p key={workflow.file} className="py-0.5 font-mono text-[11px] leading-5">
              <span className="text-ink">{workflow.name}</span>
              {workflow.triggers ? <span className="text-ink-dim"> · on {workflow.triggers}</span> : null}
            </p>
          ))}
        </LabeledPanel>
      ) : null}
      {runtime.containers.length > 0 ? (
        <LabeledPanel label="Containers" panelClassName="px-2 py-1.5">
          {runtime.containers.map((path) => (
            <p key={path} className="py-0.5 font-mono text-[11px] leading-5 text-ink">{path}</p>
          ))}
        </LabeledPanel>
      ) : null}
    </div>
  );
}
