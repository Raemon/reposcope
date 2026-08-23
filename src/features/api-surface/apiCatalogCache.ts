import { buildAppRouteCatalog, type AppRoute } from './appRouteCatalog';
import { buildApiSourceIndex } from './apiSourceIndex';
import { buildApiTypeCatalog } from './apiTypeCatalog';
import { buildApiTypeSections, type ApiTypeSection } from './apiTypeSectionCatalog';
import { discoverApiEndpoints } from './discoverApiEndpoints';
import { findApiConsumerCandidates, findApiConsumers } from './findApiConsumers';
import { loadCodebase, type Codebase } from '@/features/codebases/codebaseSource';
import { resolveRepoHead } from '@/features/codebases/repoHead';
import { buildRepoInsights } from '@/features/repo-insights/repoInsights';
import type { RepoInsights } from '@/features/repo-insights/insightTypes';
import type { ApiEndpoint, ApiSourceIndex } from './apiEndpointTypes';

interface CodebaseApiSurface {
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
  const head = await resolveRepoHead(owner, repo).catch(() => null);
  const key = head && `${owner}/${repo}@${head.sha}`;
  const held = key ? cache.get(key) : undefined;
  if (held) return held;
  const startedFetch = Date.now();
  const codebase = await loadCodebase(owner, repo, head?.sha ?? null);
  const startedAnalysis = Date.now();
  const index = buildApiSourceIndex(codebase.files);
  const endpoints = apiEndpointsIn(index);
  const surface = {
    codebase,
    endpoints,
    typeSections: buildApiTypeSections(buildApiTypeCatalog(index, endpoints), endpoints),
    routes: buildAppRouteCatalog(index),
    insights: { ...buildRepoInsights(codebase, endpoints), activity: head && { commits: head.commits } },
    fetchedInMs: startedAnalysis - startedFetch,
    analyzedInMs: Date.now() - startedAnalysis,
  };
  if (key) {
    cache.set(key, surface);
    while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
  }
  return surface;
}

function apiEndpointsIn(index: ApiSourceIndex): ApiEndpoint[] {
  const candidates = findApiConsumerCandidates(index);
  return discoverApiEndpoints(index)
    .map((endpoint) => ({ ...endpoint, consumers: findApiConsumers(endpoint, candidates) }))
    .sort(compareEndpoints);
}

function compareEndpoints(left: ApiEndpoint, right: ApiEndpoint): number {
  const pathOrder = left.path.localeCompare(right.path);
  return pathOrder === 0 ? left.method.localeCompare(right.method) : pathOrder;
}
