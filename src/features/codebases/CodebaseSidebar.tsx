'use client';

import Link from 'next/link';
import { CodebaseList } from './CodebaseList';
import { sidebarGroups } from './sidebarGroups';
import { useSourceResults } from './useSourceResults';
import { clearGithubToken, removeSource, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';

export function CodebaseSidebar() {
  const ready = useStoreReady();
  const sources = useSources();
  const token = useGithubToken();
  const results = useSourceResults(sources, token, ready);
  const connected = sources.some((source) => source.kind === 'viewer');
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-panel-edge bg-panel">
      <div className="border-b border-panel-edge px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-dim">Codebases</p>
        <Link href="/" className="text-sm text-accent">
          apiscope
        </Link>
      </div>
      {!ready ? (
        <p className="px-3 py-3 text-[11px] leading-4 text-ink-dim">Loading…</p>
      ) : sources.length === 0 ? (
        <p className="px-3 py-3 text-[11px] leading-4 text-ink-dim">
          No repositories yet.{' '}
          <Link href="/" className="text-accent underline">
            Add one
          </Link>{' '}
          to get started.
        </p>
      ) : (
        <CodebaseList groups={sidebarGroups(sources, results)} />
      )}
      {connected && (
        <div className="border-t border-panel-edge px-3 py-2">
          <button
            type="button"
            onClick={() => {
              clearGithubToken();
              removeSource({ kind: 'viewer' });
            }}
            className="text-[10px] text-ink-dim hover:text-error-ink"
          >
            disconnect GitHub
          </button>
        </div>
      )}
    </aside>
  );
}
