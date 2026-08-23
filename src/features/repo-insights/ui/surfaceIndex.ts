import type { RepoSurfacePayload } from '@/features/codebases/repoSurfacePayload';
import { surfaceViewLabels, type SurfaceViewId } from './surfaceViews';
import type { MapNode, SourceLocation } from '../insightTypes';

export interface SurfaceItem {
  kind: string;
  label: string;
  detail: string;
  viewId: SurfaceViewId;
  at?: SourceLocation;
  target?: string;
}

export interface SurfaceGroup {
  viewId: SurfaceViewId;
  label: string;
  items: SurfaceItem[];
  more: number;
}

const PER_GROUP = 8;

export function surfaceIndex(surface: RepoSurfacePayload): SurfaceItem[] {
  const { insights } = surface;
  return [
    ...endpointItems(surface),
    ...routeItems(surface),
    ...typeItems(surface),
    ...entryPointItems(surface),
    ...mapItems(insights.map),
    ...dependencyItems(surface),
    ...runtimeItems(surface),
    ...modelItems(surface),
    ...testItems(surface),
  ];
}

export function locationTarget(at: { file: string; line: number }): string {
  return `${at.file}:${at.line}`;
}

function shortLocation(at: { file: string; line: number }): string {
  const segments = at.file.split('/');
  const file = segments.length <= 2 ? at.file : `…/${segments.slice(-2).join('/')}`;
  return `${file}:${at.line}`;
}

export function targetHoldsPath(target: string | null, path: string): boolean {
  if (target === null || path === '') return false;
  const held = target.split(':')[0]!;
  return held === path || held.startsWith(`${path}/`);
}

export function surfaceQuery(params: URLSearchParams): string {
  return params.toString().replace(/%2F/g, '/').replace(/%3A/g, ':');
}

export function searchSurface(items: SurfaceItem[], query: string): SurfaceGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];
  const ranked = new Map<SurfaceViewId, { item: SurfaceItem; rank: number }[]>();
  for (const item of items) {
    const rank = rankOf(item, needle);
    if (rank === null) continue;
    ranked.set(item.viewId, [...(ranked.get(item.viewId) ?? []), { item, rank }]);
  }
  return (Object.keys(surfaceViewLabels) as SurfaceViewId[])
    .map((viewId) => groupOf(viewId, ranked.get(viewId) ?? []))
    .filter((group) => group.items.length > 0);
}

function groupOf(viewId: SurfaceViewId, held: { item: SurfaceItem; rank: number }[]): SurfaceGroup {
  const ordered = [...held].sort(
    (left, right) =>
      left.rank - right.rank ||
      left.item.label.length - right.item.label.length ||
      left.item.label.localeCompare(right.item.label),
  );
  return {
    viewId,
    label: surfaceViewLabels[viewId],
    items: ordered.slice(0, PER_GROUP).map((entry) => entry.item),
    more: Math.max(ordered.length - PER_GROUP, 0),
  };
}

function rankOf(item: SurfaceItem, needle: string): number | null {
  const index = item.label.toLowerCase().indexOf(needle);
  if (index === 0) return 0;
  if (index > 0) return 1;
  if (item.detail.toLowerCase().includes(needle)) return 2;
  if (item.kind.toLowerCase().includes(needle)) return 3;
  return null;
}

function endpointItems(surface: RepoSurfacePayload): SurfaceItem[] {
  return surface.endpoints.map((endpoint) => ({
    kind: endpoint.method,
    label: `${endpoint.method} ${endpoint.path}`,
    detail: `${endpoint.code.symbol} · ${shortLocation(endpoint.code)}`,
    viewId: 'api' as const,
    at: endpoint.code,
    target: locationTarget(endpoint.code),
  }));
}

function routeItems(surface: RepoSurfacePayload): SurfaceItem[] {
  return surface.routes.map((route) => ({
    kind: 'page',
    label: route.path,
    detail: route.file,
    viewId: 'api' as const,
  }));
}

function typeItems(surface: RepoSurfacePayload): SurfaceItem[] {
  const seen = new Set<string>();
  const items: SurfaceItem[] = [];
  for (const section of surface.typeSections) {
    for (const entry of section.entries) {
      const target = locationTarget(entry);
      if (seen.has(target)) continue;
      seen.add(target);
      items.push({
        kind: entry.kind,
        label: entry.name,
        detail: `${section.title} · ${shortLocation(entry)}`,
        viewId: 'api',
        at: entry,
      });
    }
  }
  return items;
}

function entryPointItems(surface: RepoSurfacePayload): SurfaceItem[] {
  return surface.insights.entryPoints.map((entry) => ({
    kind: entry.kind,
    label: `${entry.method} ${entry.name}`.trim(),
    detail: `${entry.framework} · ${shortLocation(entry.at)}`,
    viewId: 'entry' as const,
    at: entry.at,
  }));
}

function mapItems(map: MapNode): SurfaceItem[] {
  const items: SurfaceItem[] = [];
  walk(map);
  return items;

  function walk(node: MapNode): void {
    if (node.path !== '') {
      items.push({
        kind: 'dir',
        label: `${node.path}/`,
        detail: node.gloss ?? `${node.files} files · ${node.codeLines.toLocaleString()} loc`,
        viewId: 'map',
        target: node.path,
      });
    }
    for (const symbol of node.symbols) {
      items.push({
        kind: symbol.kind,
        label: symbol.name,
        detail: shortLocation(symbol.at),
        viewId: 'map',
        at: symbol.at,
        target: locationTarget(symbol.at),
      });
    }
    for (const child of node.children) walk(child);
  }
}

function dependencyItems(surface: RepoSurfacePayload): SurfaceItem[] {
  return surface.insights.dependencies.flatMap((manifest) =>
    manifest.entries.map((entry) => ({
      kind: entry.group === 'dev' ? 'dev dep' : 'dep',
      label: entry.name,
      detail: `${entry.version} · ${manifest.file}${entry.usedIn > 0 ? ` · imported in ${entry.usedIn}` : ''}`,
      viewId: 'dependencies' as const,
    })),
  );
}

function runtimeItems(surface: RepoSurfacePayload): SurfaceItem[] {
  const { envVars, ports, scripts, workflows, containers } = surface.insights.runtime;
  return [
    ...envVars.map((held) => ({
      kind: 'env',
      label: held.name,
      detail: held.documented ? 'documented' : `${held.sites.length} reads · undocumented`,
      viewId: 'runtime' as const,
      at: held.sites[0],
    })),
    ...ports.map((held) => ({
      kind: 'port',
      label: `:${held.port}`,
      detail: shortLocation(held.at),
      viewId: 'runtime' as const,
      at: held.at,
    })),
    ...scripts.map((script) => ({
      kind: 'script',
      label: script.name,
      detail: script.command,
      viewId: 'runtime' as const,
    })),
    ...workflows.map((workflow) => ({
      kind: 'workflow',
      label: workflow.name,
      detail: workflow.triggers ? `${workflow.file} · on ${workflow.triggers}` : workflow.file,
      viewId: 'runtime' as const,
    })),
    ...containers.map((path) => ({
      kind: 'container',
      label: path,
      detail: 'container file',
      viewId: 'runtime' as const,
    })),
  ];
}

function modelItems(surface: RepoSurfacePayload): SurfaceItem[] {
  return surface.insights.models.map((model) => ({
    kind: model.kind,
    label: model.name,
    detail: `${model.fields.length} fields · ${shortLocation(model.at)}`,
    viewId: 'models' as const,
    at: model.at,
  }));
}

function testItems(surface: RepoSurfacePayload): SurfaceItem[] {
  return surface.insights.tests.files.map((file) => ({
    kind: 'test',
    label: file.file,
    detail: `${file.framework} · ${file.caseCount} cases`,
    viewId: 'tests' as const,
    target: file.file,
  }));
}
