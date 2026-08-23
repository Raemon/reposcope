import ts from 'typescript';
import { apiLineOf, defaultApiExport, resolveApiDeclaration } from './apiSourceIndex';
import { appRouterPath, pagesRouterPath } from './discoverApiEndpoints';
import { findApiConsumerCandidates } from './findApiConsumers';
import type { ApiDeclarationRef, ApiSourceIndex, IndexedApiFile } from './apiEndpointTypes';

export interface AppRouteApiCall {
  method: string;
  path: string;
  through: string;
}

export interface AppRouteComponent {
  name: string;
  file: string;
  line: number;
  calls: AppRouteApiCall[];
  children: AppRouteComponent[];
}

export interface AppRoute {
  path: string;
  file: string;
  component: AppRouteComponent;
}

const MAX_COMPONENT_DEPTH = 6;
const MAX_HELPER_DEPTH = 3;

const APP_ROUTER_PAGE = /(?:^|\/)app\/.*page\.(?:tsx|jsx|ts|js)$/;
const PAGES_ROUTER_PAGE = /(?:^|\/)pages\/(?!api\/).*\.(?:tsx|jsx)$/;
const MAX_ROUTES = 400;

export function buildAppRouteCatalog(index: ApiSourceIndex): AppRoute[] {
  const calls = callsBySymbol(index);
  return pageFiles(index)
    .map((file) => routeFrom(file, index, calls))
    .filter((route): route is AppRoute => route !== null)
    .sort((left, right) => left.path.localeCompare(right.path))
    .slice(0, MAX_ROUTES);
}

function pageFiles(index: ApiSourceIndex): IndexedApiFile[] {
  return [...index.files.values()]
    .filter((file) => APP_ROUTER_PAGE.test(file.path) || pagesRouterPage(file.path));
}

function pagesRouterPage(path: string): boolean {
  const name = path.split('/').at(-1) ?? '';
  return PAGES_ROUTER_PAGE.test(path) && !name.startsWith('_');
}

function routeFrom(
  file: IndexedApiFile,
  index: ApiSourceIndex,
  calls: Map<string, AppRouteApiCall[]>,
): AppRoute | null {
  const entry = defaultApiExport(file);
  if (!entry) return null;
  return {
    path: pagesRouterPage(file.path) ? pagesRouterPath(file.path) : appRouterPath(file.path),
    file: file.path,
    component: componentTree(entry, index, calls, 0, new Set()),
  };
}

function componentTree(
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
  calls: Map<string, AppRouteApiCall[]>,
  depth: number,
  seen: Set<string>,
): AppRouteComponent {
  seen.add(componentIdentity(ref));
  return {
    name: ref.symbol,
    file: ref.file.path,
    line: apiLineOf(ref.file, ref.node),
    calls: componentCalls(ref, index, calls),
    children: depth >= MAX_COMPONENT_DEPTH ? [] : childRefs(ref, index)
      .filter((child) => !seen.has(componentIdentity(child)))
      .map((child) => componentTree(child, index, calls, depth + 1, seen)),
  };
}

function childRefs(ref: ApiDeclarationRef, index: ApiSourceIndex): ApiDeclarationRef[] {
  return [...new Set(renderedNames(ref.node))]
    .map((name) => resolveApiDeclaration(ref.file, name, index))
    .filter((child): child is ApiDeclarationRef => child !== null && child.node !== ref.node);
}

function renderedNames(node: ts.Node): string[] {
  const names: string[] = [];
  visit(node);
  return names;

  function visit(current: ts.Node): void {
    if (ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)) {
      const name = current.tagName.getText(current.getSourceFile());
      if (/^[A-Z]/.test(name) && !name.includes('.')) names.push(name);
    }
    ts.forEachChild(current, visit);
  }
}

function componentCalls(
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
  calls: Map<string, AppRouteApiCall[]>,
): AppRouteApiCall[] {
  const found = new Map<string, AppRouteApiCall>();
  const visited = new Set<string>();
  collect(ref, ref.symbol, 0);
  return [...found.values()];

  function collect(current: ApiDeclarationRef, through: string, depth: number): void {
    const identity = componentIdentity(current);
    if (visited.has(identity)) return;
    visited.add(identity);
    for (const call of calls.get(identity) ?? []) {
      found.set(`${call.method} ${call.path}`, { ...call, through });
    }
    if (depth >= MAX_HELPER_DEPTH) return;
    for (const name of calledNames(current.node)) {
      const helper = resolveApiDeclaration(current.file, name, index);
      if (helper && helper.node !== current.node) collect(helper, depth === 0 ? name : through, depth + 1);
    }
  }
}

function calledNames(node: ts.Node): string[] {
  const names: string[] = [];
  visit(node);
  return [...new Set(names)];

  function visit(current: ts.Node): void {
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) names.push(current.expression.text);
    if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression) &&
      ts.isIdentifier(current.expression.expression)) names.push(current.expression.expression.text);
    ts.forEachChild(current, visit);
  }
}

function callsBySymbol(index: ApiSourceIndex): Map<string, AppRouteApiCall[]> {
  const calls = new Map<string, AppRouteApiCall[]>();
  for (const candidate of findApiConsumerCandidates(index)) {
    const key = `${candidate.file}:${candidate.symbol}`;
    const held = calls.get(key) ?? [];
    held.push({ method: candidate.method ?? 'GET', path: candidate.path, through: candidate.symbol });
    calls.set(key, held);
  }
  return calls;
}

function componentIdentity(ref: ApiDeclarationRef): string {
  return `${ref.file.path}:${ref.symbol}`;
}
