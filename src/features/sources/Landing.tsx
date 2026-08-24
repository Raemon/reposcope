'use client';

import { SourceControls } from './SourceControls';
import { useGithubToken, useSources, useStoreReady } from './sourceStore';
import { CodebaseList } from '@/features/codebases/CodebaseList';
import { sidebarGroups } from '@/features/codebases/sidebarGroups';
import { useSourceResults } from '@/features/codebases/useSourceResults';

export function Landing({ error, oauthConfigured }: { error: string | null; oauthConfigured: boolean }) {
  const ready = useStoreReady();
  const sources = useSources();
  const token = useGithubToken();
  const results = useSourceResults(sources, token, ready);
  const onboarding = !ready || sources.length === 0;
  return (
    <section className="max-w-2xl">
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">
        {onboarding ? 'Choose what to read' : 'Read straight from GitHub'}
      </p>
      <h1 className="text-xl text-accent">Shoggoth Reviews</h1>
      <p className="mt-2 text-xs leading-5 text-ink-dim">
        {onboarding ? 'Point Shoggoth Reviews at GitHub repositories. ' : 'Pick a repository below to read it. '}
        Each one is fetched from GitHub in memory, parsed, and rendered as its server boundary: URL layers, the code
        each operation reaches, and the in-repo callers that make it matter to a person.
      </p>
      {error && (
        <p className="mt-3 rounded border border-error-edge bg-error-bg px-3 py-2 text-xs text-error-ink">{error}</p>
      )}
      {!onboarding && (
        <>
          <p className="mb-1 mt-5 text-[10px] uppercase tracking-[0.18em] text-ink-dim">Your codebases</p>
          <div className="flex max-h-[26rem] flex-col overflow-hidden rounded border border-panel-edge bg-panel">
            <CodebaseList groups={sidebarGroups(sources, results)} />
          </div>
          <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-ink-dim">Add more</p>
        </>
      )}
      <SourceControls compact={!onboarding} oauthConfigured={oauthConfigured} />
    </section>
  );
}
