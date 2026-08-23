import { buildDependencySurface } from './dependencySurface';
import { buildSchemaSurface } from './schemaSurface';
import { discoverEntryPoints } from './entryPoints';
import { buildRuntimeSurface } from './runtimeSurface';
import { buildStructureMap } from './structureMap';
import { buildTestSurface } from './testSurface';
import type { Codebase } from '@/features/codebases/codebaseSource';
import type { ApiEndpoint } from '@/features/api-surface/apiEndpointTypes';
import type { RepoInsights } from './insightTypes';

export function buildRepoInsights(codebase: Codebase, endpoints: ApiEndpoint[]): Omit<RepoInsights, 'activity'> {
  const claimed = new Set(
    endpoints.map((endpoint) => `${endpoint.transport} ${endpoint.method} ${endpoint.path}`),
  );
  return {
    entryPoints: discoverEntryPoints(codebase.files, claimed),
    map: buildStructureMap(codebase.inventory, codebase.files),
    dependencies: buildDependencySurface(codebase.files, codebase.inventory),
    runtime: buildRuntimeSurface(codebase.files, codebase.inventory),
    schema: buildSchemaSurface(codebase.files),
    tests: buildTestSurface(codebase.files),
  };
}
