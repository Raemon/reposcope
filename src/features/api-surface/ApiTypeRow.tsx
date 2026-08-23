'use client';

import { HoverCardTrigger } from './HoverCard';
import type { ApiTypeEntry } from './apiTypeCatalog';
import type { ApiTypeReturn } from './apiTypeSectionTypes';

const KIND_MARK: Readonly<Record<ApiTypeEntry['kind'], string>> = {
  interface: 'I',
  type: 'T',
  enum: 'E',
};

export function ApiTypeRow({ entry, returnedBy }: { entry: ApiTypeEntry; returnedBy: ApiTypeReturn[] }) {
  return (
    <tr className="border-b border-panel-edge/70 last:border-b-0">
      <td className="h-7 w-px py-0 pl-4 pr-1 align-middle">
        <ApiTypeKindMark entry={entry} />
      </td>
      <td className="h-7 whitespace-nowrap py-0 pl-1.5 pr-2 align-middle">
        <ApiTypeName entry={entry} returnedBy={returnedBy} />
      </td>
    </tr>
  );
}

export function ApiTypeKindMark({ entry }: { entry: ApiTypeEntry }) {
  return (
    <span
      className={`text-[9px] tracking-[0.08em] ${entry.reachedByApi ? 'text-accent opacity-70' : 'text-ink opacity-30'}`}
      title={entry.kind}
    >
      {KIND_MARK[entry.kind]}
    </span>
  );
}

export function ApiTypeName({ entry, returnedBy }: { entry: ApiTypeEntry; returnedBy: ApiTypeReturn[] }) {
  return (
    <>
      <HoverCardTrigger
        label={`${entry.file}:${entry.line}`}
        card={<TypeCard entry={entry} returnedBy={returnedBy} />}
        className="min-w-0"
      >
        <code className={`truncate text-[11px] ${entry.reachedByApi ? 'text-ink' : 'text-ink-dim'}`}>
          {entry.name}
        </code>
      </HoverCardTrigger>
      {returnedBy.length > 0 ? (
        <span className="ml-2 font-mono text-[9px] text-ink-dim">{returnSummary(returnedBy)}</span>
      ) : null}
    </>
  );
}

function TypeCard({ entry, returnedBy }: { entry: ApiTypeEntry; returnedBy: ApiTypeReturn[] }) {
  return (
    <>
      <p className="mb-1 text-[9px] uppercase tracking-[0.14em] text-ink-dim">
        {entry.kind}{entry.exported ? ' · exported' : ' · module-private'}
        {entry.reachedByApi ? ' · on the API path' : ''}
      </p>
      <pre className="whitespace-pre font-mono text-[10px] leading-4 text-ink">{entry.excerpt}</pre>
      {returnedBy.length > 0 ? (
        <div className="mt-1.5 border-t border-panel-edge pt-1.5">
          <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-ink-dim">Returned by</p>
          {distinctReturns(returnedBy).map((use) => (
            <div key={`${use.method} ${use.path} ${use.status}`} className="font-mono text-[10px] leading-4 text-ink">
              <span className="text-accent opacity-80">{use.method}</span> {use.path}
              <span className="ml-1.5 text-ink-dim">{use.status}{use.through !== '' ? ` via ${use.through}` : ''}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function returnSummary(returnedBy: ApiTypeReturn[]): string {
  const endpoints = new Set(returnedBy.map((use) => `${use.method} ${use.path}`));
  const through = [...new Set(returnedBy.map((use) => use.through).filter((name) => name !== ''))];
  const count = `${endpoints.size} ${endpoints.size === 1 ? 'endpoint' : 'endpoints'}`;
  return through.length > 0 ? `${count} via ${through.join(', ')}` : count;
}

function distinctReturns(returnedBy: ApiTypeReturn[]): ApiTypeReturn[] {
  const seen = new Map<string, ApiTypeReturn>();
  for (const use of returnedBy) seen.set(`${use.method} ${use.path} ${use.status}`, use);
  return [...seen.values()].sort((left, right) => left.status - right.status || left.path.localeCompare(right.path));
}
