'use client';

import { useEffect, useState } from 'react';
import { ApiEndpointDocumentation } from '@/features/api-surface/ApiEndpointDocumentation';
import { ApiTypeDocumentation } from '@/features/api-surface/ApiTypeDocumentation';
import { AppRouteDocumentation } from '@/features/api-surface/AppRouteDocumentation';
import type { RepoSurfacePayload } from '@/features/codebases/repoSurfacePayload';
import { ApiClientError, apiJson } from '@/features/sources/apiClient';
import { addSource, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';
import { coversRepo } from '@/features/sources/sourceTypes';

type SurfaceState =
  | { state: 'loading' }
  | { state: 'error'; status: number; message: string }
  | { state: 'ready'; surface: RepoSurfacePayload };

export function RepoSurface({ owner, repo }: { owner: string; repo: string }) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const sources = useSources();
  const [held, setHeld] = useState<SurfaceState>({ state: 'loading' });
  const heading = `${owner}/${repo}`;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setHeld({ state: 'loading' });
    apiJson<RepoSurfacePayload>(
      `/api/surface/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token,
      controller.signal,
    )
      .then((surface) => setHeld({ state: 'ready', surface }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const status = error instanceof ApiClientError ? error.status : 0;
        setHeld({ state: 'error', status, message: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [owner, repo, token, ready]);

  const offer = ready && !coversRepo(sources, owner, repo) && (
    <button
      type="button"
      onClick={() => addSource({ kind: 'repo', owner, name: repo })}
      className="mb-3 rounded border border-btn-edge bg-btn px-2 py-0.5 text-[10px] text-ink-dim hover:bg-btn-hover hover:text-ink"
    >
      + add to sidebar
    </button>
  );

  if (held.state === 'loading') return <p className="text-xs text-ink-dim">Fetching and parsing the repository…</p>;
  if (held.state === 'error' && held.status === 404) {
    return (
      <section className="max-w-2xl">
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">Not found</p>
        <h1 className="text-xl text-accent">{heading}</h1>
        <p className="mt-2 text-xs leading-5 text-ink-dim">
          GitHub did not return this repository. It may not exist, or it may be private: connect a GitHub account that
          can see it from the landing page.
        </p>
      </section>
    );
  }
  if (held.state === 'error') {
    return (
      <section className="max-w-2xl">
        {offer}
        <h1 className="text-xl text-accent">{heading}</h1>
        <p className="mt-2 rounded border border-error-edge bg-error-bg px-3 py-2 text-xs text-error-ink">
          {held.message}
        </p>
      </section>
    );
  }
  const { read, endpoints, typeSections, routes } = held.surface;
  if (endpoints.length === 0 && routes.length === 0) {
    return (
      <section className="max-w-2xl">
        {offer}
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">{read}</p>
        <h1 className="text-xl text-accent">{heading}</h1>
        <p className="mt-2 text-xs leading-5 text-ink-dim">
          No server boundary and no page tree found. apiscope reads Next.js route handlers and pages API routes,
          Express-style route registrations, WebSocket upgrade handlers, and the app or pages directory.
        </p>
      </section>
    );
  }
  return (
    <div>
      {offer}
      <div className="flex flex-wrap items-start gap-8">
        <ApiEndpointDocumentation endpoints={endpoints} heading={heading} summary={read} />
        <ApiTypeDocumentation sections={typeSections} />
        <AppRouteDocumentation routes={routes} />
      </div>
    </div>
  );
}
