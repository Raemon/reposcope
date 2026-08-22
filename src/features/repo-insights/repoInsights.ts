import { buildDependencySurface } from './dependencySurface';
import { discoverDataModels } from './dataModels';
import { discoverEntryPoints } from './entryPoints';
import { buildRuntimeSurface } from './runtimeSurface';
import { buildStructureMap, overallLanguages } from './structureMap';
import { buildTestSurface } from './testSurface';
import type { Codebase } from '@/features/codebases/codebaseSource';
import type { ApiEndpoint } from '@/features/api-surface/apiEndpointTypes';
import type { RepoInsights } from './insightTypes';

export function buildRepoInsights(codebase: Codebase, endpoints: ApiEndpoint[]): Omit<RepoInsights, 'activity'> {
  const claimed = new Set(
    endpoints.map((endpoint) => `${endpoint.transport === 'websocket' ? 'websocket' : 'http'} ${endpoint.method} ${endpoint.path}`),
  );
  return {
    languages: overallLanguages(codebase.inventory, codebase.files),
    entryPoints: discoverEntryPoints(codebase.files, claimed),
    map: buildStructureMap(codebase.inventory, codebase.files),
    dependencies: buildDependencySurface(codebase.files, codebase.inventory),
    runtime: buildRuntimeSurface(codebase.files, codebase.inventory),
    models: discoverDataModels(codebase.files),
    tests: buildTestSurface(codebase.files),
  };
}
