import { buildApiSourceIndex } from './apiSourceIndex';
import { discoverApiEndpoints } from './discoverApiEndpoints';
import { findApiConsumerCandidates, findApiConsumers } from './findApiConsumers';
import type { CodebaseFile } from '@/features/codebases/codebaseSource';
import type { ApiCodeStep, ApiEndpoint, ApiSourceIndex } from './apiEndpointTypes';

export type {
  ApiCodeStep,
  ApiConsumer,
  ApiEndpoint,
} from './apiEndpointTypes';

export function buildApiEndpointCatalog(files: CodebaseFile[]): ApiEndpoint[] {
  return apiEndpointsIn(buildApiSourceIndex(files));
}

export function apiEndpointsIn(index: ApiSourceIndex): ApiEndpoint[] {
  const candidates = findApiConsumerCandidates(index);
  return discoverApiEndpoints(index)
    .map((endpoint) => ({ ...endpoint, consumers: findApiConsumers(endpoint, candidates) }))
    .sort(compareEndpoints);
}

export function codeStepCount(step: ApiCodeStep): number {
  return 1 + step.calls.reduce((total, call) => total + codeStepCount(call), 0);
}

export function codeSymbols(step: ApiCodeStep): string[] {
  return [step.symbol, ...step.calls.flatMap(codeSymbols)];
}

function compareEndpoints(left: ApiEndpoint, right: ApiEndpoint): number {
  const pathOrder = left.path.localeCompare(right.path);
  return pathOrder === 0 ? left.method.localeCompare(right.method) : pathOrder;
}
