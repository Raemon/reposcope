'use client';

import { SourceControls } from './SourceControls';
import { useSources, useStoreReady } from './sourceStore';

export function Landing({ error, oauthConfigured }: { error: string | null; oauthConfigured: boolean }) {
  const ready = useStoreReady();
  const sources = useSources();
  const onboarding = !ready || sources.length === 0;
  return (
    <section className="max-w-2xl">
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">
        {onboarding ? 'Choose what to read' : 'Read straight from GitHub'}
      </p>
      <h1 className="text-xl text-accent">reposcope</h1>
      <p className="mt-2 text-xs leading-5 text-ink-dim">
        {onboarding ? 'Point reposcope at GitHub repositories. ' : 'Pick a repository on the left. '}
        Each one is fetched from GitHub in memory, parsed, and rendered as its server boundary: URL layers, the code
        each operation reaches, and the in-repo callers that make it matter to a person.
      </p>
      {error && (
        <p className="mt-3 rounded border border-error-edge bg-error-bg px-3 py-2 text-xs text-error-ink">{error}</p>
      )}
      {!onboarding && <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-ink-dim">Add more</p>}
      <SourceControls compact={!onboarding} oauthConfigured={oauthConfigured} />
    </section>
  );
}
