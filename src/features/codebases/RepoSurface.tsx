'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ApiEndpointDocumentation } from '@/features/api-surface/ApiEndpointDocumentation';
import { ApiTypeDocumentation } from '@/features/api-surface/ApiTypeDocumentation';
import { AppRouteDocumentation } from '@/features/api-surface/AppRouteDocumentation';
import { ActivityView } from '@/features/repo-insights/ui/ActivityView';
import { DataModelsView } from '@/features/repo-insights/ui/DataModelsView';
import { DependenciesView } from '@/features/repo-insights/ui/DependenciesView';
import { EntryPointsView } from '@/features/repo-insights/ui/EntryPointsView';
import { JumpPalette } from '@/features/repo-insights/ui/JumpPalette';
import { languageSegments, MeterBar } from '@/features/surface-ui/MeterBar';
import { RuntimeView } from '@/features/repo-insights/ui/RuntimeView';
import { RepoRefProvider } from '@/features/surface-ui/SourceRef';
import { StructureMapView } from '@/features/repo-insights/ui/StructureMapView';
import { TestsView } from '@/features/repo-insights/ui/TestsView';
import { ViewSwitcher } from '@/features/repo-insights/ui/ViewSwitcher';
import { surfaceIndex, type SurfaceItem } from '@/features/repo-insights/ui/surfaceIndex';
import { surfaceQuery } from '@/features/repo-insights/sourceTarget';
import { defaultViewId, surfaceViews, type SurfaceViewId } from '@/features/repo-insights/ui/surfaceViews';
import type { RepoSurfacePayload } from '@/features/codebases/repoSurfacePayload';
import { ApiClientError, apiJson } from '@/features/sources/apiClient';
import { addSource, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';
import { coversRepo } from '@/features/sources/sourceTypes';

type SurfaceState =
  | { state: 'loading' }
  | { state: 'error'; status: number; message: string }
  | { state: 'ready'; surface: RepoSurfacePayload };

export function SurfaceLoading({ heading }: { heading: string }) {
  return (
    <section className="max-w-2xl">
      <h1 className="text-xl text-accent">{heading}</h1>
      <ElapsedNote key={heading} />
    </section>
  );
}

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

  if (held.state === 'loading') return <SurfaceLoading heading={heading} />;
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
  return (
    <RepoRefProvider owner={owner} repo={repo}>
      {offer}
      <SurfaceBody surface={held.surface} />
    </RepoRefProvider>
  );
}

const PATIENCE_SECONDS = 20;

function ElapsedNote() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const ticker = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(ticker);
  }, []);

  return (
    <>
      <p className="mt-2 text-xs leading-5 text-ink-dim">Fetching and parsing the repository… {seconds}s</p>
      {seconds >= PATIENCE_SECONDS && (
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          Large repositories take a while: every file is read and parsed before anything is drawn.
        </p>
      )}
    </>
  );
}

function SurfaceBody({ surface }: { surface: RepoSurfacePayload }) {
  const views = surfaceViews(surface);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fallback = defaultViewId(views);
  const requested = searchParams.get('view');
  const match = views.find((view) => view.id === requested && view.available);
  const shown = match?.id ?? fallback;

  const reveal = searchParams.get('at');
  const items = useMemo(() => surfaceIndex(surface), [surface]);

  const hrefFor = (id: SurfaceViewId, target?: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete('at');
    if (id === fallback) params.delete('view');
    else params.set('view', id);
    if (target) params.set('at', target);
    const query = surfaceQuery(params);
    return query ? `${pathname}?${query}` : pathname;
  };

  const viewHref = (id: SurfaceViewId) => hrefFor(id);
  const jumpHref = (item: SurfaceItem) => hrefFor(item.viewId, item.target);

  const selectView = (id: SurfaceViewId) => {
    if (id === shown && reveal === null) return;
    window.history.pushState(null, '', viewHref(id));
  };

  const selectItem = (item: SurfaceItem) => {
    const standing = item.viewId === shown && (item.target ?? null) === reveal;
    window.history.pushState(null, '', jumpHref(item));
    if (standing) document.querySelector('[data-reveal="true"]')?.scrollIntoView({ block: 'center' });
  };

  const { languages } = surface.insights.map;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-dim">{surface.read}</p>
        {languages.length > 0 ? (
          <span className="flex items-center gap-2">
            <MeterBar width="w-32" segments={languageSegments(languages)} />
            <span className="font-mono text-[10px] text-ink-dim">
              {languages.slice(0, 3).map((held) => held.language).join(' · ')}
            </span>
          </span>
        ) : null}
        <JumpPalette items={items} hrefOf={jumpHref} onSelect={selectItem} />
      </div>
      <ViewSwitcher views={views} active={shown} viewHref={viewHref} onSelect={selectView} />
      <ActiveView id={shown} surface={surface} reveal={reveal} />
    </div>
  );
}

function ActiveView({
  id,
  surface,
  reveal,
}: {
  id: SurfaceViewId;
  surface: RepoSurfacePayload;
  reveal: string | null;
}) {
  const { insights } = surface;
  switch (id) {
    case 'api':
      return (
        <div className="flex flex-wrap items-start gap-8">
          <ApiEndpointDocumentation endpoints={surface.endpoints} reveal={reveal} />
          <ApiTypeDocumentation sections={surface.typeSections} />
          <AppRouteDocumentation routes={surface.routes} />
        </div>
      );
    case 'entry':
      return <EntryPointsView entryPoints={insights.entryPoints} deepCount={surface.endpoints.length} />;
    case 'map':
      return <StructureMapView map={insights.map} reveal={reveal} />;
    case 'dependencies':
      return <DependenciesView manifests={insights.dependencies} />;
    case 'runtime':
      return <RuntimeView runtime={insights.runtime} />;
    case 'models':
      return <DataModelsView models={insights.models} />;
    case 'tests':
      return <TestsView tests={insights.tests} reveal={reveal} />;
    case 'activity':
      return insights.activity ? <ActivityView activity={insights.activity} /> : null;
  }
}
