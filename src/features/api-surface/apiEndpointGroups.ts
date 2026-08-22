import type { ApiEndpoint } from './apiEndpointTypes';

export interface ApiEndpointGroup {
  segment: string;
  path: string;
  endpoints: ApiEndpoint[];
  children: ApiEndpointGroup[];
}

interface MutableApiEndpointGroup extends ApiEndpointGroup {
  childGroups: Map<string, MutableApiEndpointGroup>;
}

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'WS'];

export function groupApiEndpoints(endpoints: ApiEndpoint[]): ApiEndpointGroup[] {
  const root = mutableGroup('', '');
  for (const endpoint of endpoints) addEndpoint(root, endpoint);
  return finalizeGroups(root);
}

export function apiMethodColumns(endpoints: ApiEndpoint[]): string[] {
  return [...new Set(endpoints.map((endpoint) => endpoint.method))]
    .sort((left, right) => methodOrder(left) - methodOrder(right) || left.localeCompare(right));
}

export function displayApiPath(path: string): string {
  if (path === '/api' || path === '/api/v1') return path;
  return `/${path.split('/').filter(Boolean).at(-1) ?? ''}`;
}

function addEndpoint(root: MutableApiEndpointGroup, endpoint: ApiEndpoint): void {
  let parent = root;
  for (const segment of endpoint.path.split('/').filter(Boolean)) {
    const path = `${parent.path}/${segment}`;
    let group = parent.childGroups.get(segment);
    if (!group) {
      group = mutableGroup(segment, path);
      parent.childGroups.set(segment, group);
    }
    parent = group;
  }
  parent.endpoints.push(endpoint);
}

function mutableGroup(segment: string, path: string): MutableApiEndpointGroup {
  return { segment, path, endpoints: [], children: [], childGroups: new Map() };
}

function finalizeGroups(group: MutableApiEndpointGroup): ApiEndpointGroup[] {
  return [...group.childGroups.values()]
    .sort((left, right) => left.segment.localeCompare(right.segment))
    .map((child) => ({
      segment: child.segment,
      path: child.path,
      endpoints: [...child.endpoints].sort(compareMethods),
      children: finalizeGroups(child),
    }));
}

function compareMethods(left: ApiEndpoint, right: ApiEndpoint): number {
  return methodOrder(left.method) - methodOrder(right.method) || left.method.localeCompare(right.method);
}

function methodOrder(method: string): number {
  const index = METHOD_ORDER.indexOf(method);
  return index === -1 ? METHOD_ORDER.length : index;
}
