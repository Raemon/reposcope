import { apiEndpointsIn } from './apiEndpointCatalog';
import { buildAppRouteCatalog, type AppRoute } from './appRouteCatalog';
import { buildApiSourceIndex } from './apiSourceIndex';
import { buildApiTypeCatalog } from './apiTypeCatalog';
import { buildApiTypeSections } from './apiTypeSectionCatalog';
import { loadCodebase, type Codebase } from '@/features/codebases/codebaseSource';
import { fetchRepoActivity } from '@/features/repo-insights/repoActivity';
import { buildRepoInsights } from '@/features/repo-insights/repoInsights';
import type { RepoInsights } from '@/features/repo-insights/insightTypes';
import type { ApiEndpoint } from './apiEndpointTypes';
import type { ApiTypeSection } from './apiTypeSectionTypes';

export interface CodebaseApiSurface {
  codebase: Codebase;
  endpoints: ApiEndpoint[];
  typeSections: ApiTypeSection[];
  routes: AppRoute[];
  insights: RepoInsights;
  fetchedInMs: number;
  analyzedInMs: number;
}

const MAX_CACHED = 4;
const cache = new Map<string, CodebaseApiSurface>();

export async function codebaseApiSurface(owner: string, repo: string): Promise<CodebaseApiSurface> {
  const key = `${owner}/${repo}`;
  const held = cache.get(key);
  if (held) return held;
  const startedFetch = Date.now();
  const [codebase, activity] = await Promise.all([loadCodebase(owner, repo), fetchRepoActivity(owner, repo)]);
  const startedAnalysis = Date.now();
  const index = buildApiSourceIndex(codebase.files);
  const endpoints = apiEndpointsIn(index);
  const surface = {
    codebase,
    endpoints,
    typeSections: buildApiTypeSections(buildApiTypeCatalog(index, endpoints), endpoints),
    routes: buildAppRouteCatalog(index),
    insights: { ...buildRepoInsights(codebase, endpoints), activity },
    fetchedInMs: startedAnalysis - startedFetch,
    analyzedInMs: Date.now() - startedAnalysis,
  };
  cache.set(key, surface);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
  return surface;
}
