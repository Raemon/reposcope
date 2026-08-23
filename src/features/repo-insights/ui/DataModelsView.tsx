'use client';

import { Chip } from '@/features/surface-ui/Chip';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { SourceRef } from '@/features/surface-ui/SourceRef';
import type { DataModel } from '../insightTypes';

export function DataModelsView({ models }: { models: DataModel[] }) {
  const kinds = [...new Set(models.map((model) => model.kind))];
  return (
    <InsightSection
      id="data-models"
      kicker="Schemas and ORM models"
      title="Data models"
      blurb="What this codebase stores. Each table or model with the fields it declares — the nouns the whole application is built around."
      stat={`${models.length} models · ${kinds.join(', ')}`}
      as="h1"
    >
      <div className="flex flex-wrap items-start gap-4">
        {models.map((model) => (
          <InsightPanel key={`${model.kind} ${model.name}`} className="min-w-44">
            <div className="flex items-center gap-2 border-b border-panel-edge px-2 py-1.5">
              <span className="font-mono text-[12px] text-accent">{model.name}</span>
              <Chip>{model.kind}</Chip>
              <SourceRef at={model.at} />
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
        ))}
      </div>
    </InsightSection>
  );
}
