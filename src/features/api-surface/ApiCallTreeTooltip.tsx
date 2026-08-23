'use client';

import type { ReactNode } from 'react';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { INDENT_PX, NESTED_GLYPH, ROOT_GLYPH } from '@/features/surface-ui/TreeRowLabel';
import { ApiSignatureSummary, apiSignatureIsEmpty } from './ApiSignatureSummary';
import type { ApiCodeStep, ApiConsumer, ApiSignature } from './apiEndpointTypes';

export interface ApiCallTreeRoot {
  label: string;
  step: ApiCodeStep;
  consumers: ApiConsumer[];
  signature: ApiSignature;
}

export function ApiCallTreeTrigger({
  label,
  roots,
  children,
  className = '',
}: {
  label: string;
  roots: ApiCallTreeRoot[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <HoverCardTrigger label={label} className={className} card={<CallTreeCard roots={roots} />}>
      {children}
    </HoverCardTrigger>
  );
}

function CallTreeCard({ roots }: { roots: ApiCallTreeRoot[] }) {
  return (
    <>
      {roots.map((root) => (
        <section key={root.label} className="mb-2 last:mb-0">
          {roots.length > 1 ? (
            <h3 className="mb-1 text-[9px] uppercase tracking-[0.14em] text-ink-dim">{root.label}</h3>
          ) : null}
          <ApiSignatureSummary signature={root.signature} />
          {apiSignatureIsEmpty(root.signature) ? null : (
            <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-ink-dim">Runs</p>
          )}
          <CallTreeNode step={root.step} depth={0} />
          {root.consumers.length > 0 ? (
            <div className="mt-1.5 border-t border-panel-edge pt-1.5">
              <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-ink-dim">Called by</p>
              {root.consumers.map((consumer) => (
                <div key={`${consumer.symbol}:${consumer.line}`} className="pl-3 font-mono text-[10px] leading-4 text-ink">
                  {consumer.symbol}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </>
  );
}

function CallTreeNode({ step, depth }: { step: ApiCodeStep; depth: number }) {
  return (
    <div>
      <div
        className="flex min-h-4 items-center gap-1 font-mono text-[10px] leading-4 text-ink"
        style={{ paddingLeft: `${depth * INDENT_PX}px` }}
      >
        <span className="text-ink-dim" aria-hidden="true">{depth === 0 ? ROOT_GLYPH : NESTED_GLYPH}</span>
        <span>{step.symbol}</span>
      </div>
      {step.calls.map((call, index) => (
        <CallTreeNode key={`${call.symbol}:${call.line}:${index}`} step={call} depth={depth + 1} />
      ))}
    </div>
  );
}
