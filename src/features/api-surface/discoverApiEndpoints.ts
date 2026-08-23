import ts from 'typescript';
import { apiCodeTree, attachApiRegistration } from './apiCodeTree';
import { defaultApiExport, hasModifier, HTTP_METHODS, stringProperty } from './apiSourceIndex';
import { apiRouteSignature } from './apiRouteSignature';
import type {
  ApiDeclarationRef,
  ApiEndpoint,
  ApiSourceIndex,
  IndexedApiFile,
} from './apiEndpointTypes';

export function discoverApiEndpoints(index: ApiSourceIndex): ApiEndpoint[] {
  const registrations = routeRegistrations(index);
  return dedupe([
    ...appRouterEndpoints(index, registrations),
    ...pagesRouterEndpoints(index),
    ...registeredRouteEndpoints(index),
    ...webSocketEndpoints(index),
  ]);
}

function appRouterEndpoints(
  index: ApiSourceIndex,
  registrations: ReadonlyMap<string, ApiDeclarationRef>,
): ApiEndpoint[] {
  return [...index.files.values()]
    .filter((file) => /(?:^|\/)app\/.*\/route\.(?:ts|tsx|js|jsx)$/.test(file.path))
    .flatMap((file) => endpointsFromRouteFile(file, index, registrations));
}

function endpointsFromRouteFile(
  file: IndexedApiFile,
  index: ApiSourceIndex,
  registrations: ReadonlyMap<string, ApiDeclarationRef>,
): ApiEndpoint[] {
  const path = appRouterPath(file.path);
  return exportedHandlers(file).map(({ method, node }) => {
    const handler = { file, node, symbol: method };
    const code = apiCodeTree(handler, index, method);
    const registration = registrations.get(registrationKey(method, path)) ?? null;
    if (registration) attachApiRegistration(code, registration, index);
    return {
      method,
      path,
      transport: 'http' as const,
      code,
      consumers: [],
      signature: apiRouteSignature(handler, registration, index, method, path),
    };
  });
}

function exportedHandlers(file: IndexedApiFile): { method: string; node: ts.Node }[] {
  const handlers: { method: string; node: ts.Node }[] = [];
  for (const statement of file.ast.statements) handlers.push(...handlersFrom(statement));
  return handlers;
}

function handlersFrom(statement: ts.Statement): { method: string; node: ts.Node }[] {
  if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) return [];
  if (ts.isFunctionDeclaration(statement) && statement.name && HTTP_METHODS.has(statement.name.text)) {
    return [{ method: statement.name.text, node: statement }];
  }
  if (!ts.isVariableStatement(statement)) return [];
  return statement.declarationList.declarations.flatMap((declaration) =>
    ts.isIdentifier(declaration.name) && HTTP_METHODS.has(declaration.name.text)
      ? [{ method: declaration.name.text, node: declaration }]
      : [],
  );
}

function pagesRouterEndpoints(index: ApiSourceIndex): ApiEndpoint[] {
  return [...index.files.values()]
    .filter((file) => /(?:^|\/)pages\/api\/.+\.(?:ts|tsx|js|jsx)$/.test(file.path))
    .filter((file) => !file.path.split('/').at(-1)!.startsWith('_'))
    .flatMap((file) => endpointsFromPagesFile(file, index));
}

function endpointsFromPagesFile(file: IndexedApiFile, index: ApiSourceIndex): ApiEndpoint[] {
  const handler = defaultApiExport(file);
  if (!handler) return [];
  const path = pagesRouterPath(file.path);
  return methodsHandledIn(file).map((method) => ({
    method,
    path,
    transport: 'http' as const,
    code: apiCodeTree(handler, index, method),
    consumers: [],
    signature: apiRouteSignature(handler, null, index, method, path),
  }));
}

function methodsHandledIn(file: IndexedApiFile): string[] {
  const found = [...file.source.matchAll(/method\s*(?:===?|!==?)\s*['"`]([A-Z]+)['"`]/g)]
    .map((match) => match[1]!)
    .filter((method) => HTTP_METHODS.has(method));
  const switched = [...file.source.matchAll(/case\s+['"`]([A-Z]+)['"`]/g)]
    .map((match) => match[1]!)
    .filter((method) => HTTP_METHODS.has(method));
  const methods = [...new Set([...found, ...switched])];
  return methods.length > 0 ? methods : ['ANY'];
}

const ROUTE_CALL = /[A-Za-z_$]\s*\(\s*[`'"]\//;
const ROUTE_CALLEES = /^(?:get|post|put|patch|del|delete|all|use|route|serve|handle|register|add|api)/i;
const METHOD_IN_NAME = /(get|post|put|patch|delete)/i;

function registeredRouteEndpoints(index: ApiSourceIndex): ApiEndpoint[] {
  return [...index.files.values()]
    .filter((file) => ROUTE_CALL.test(file.source))
    .flatMap((file) => routeCallsIn(file, index));
}

function routeCallsIn(file: IndexedApiFile, index: ApiSourceIndex): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  visit(file.ast);
  return endpoints;

  function visit(node: ts.Node): void {
    const route = routeCall(node);
    if (route) {
      const owner = { file, node: route.handler, symbol: route.symbol };
      endpoints.push({
        method: route.method,
        path: route.path,
        transport: 'http',
        code: apiCodeTree(owner, index, route.method),
        consumers: [],
        signature: apiRouteSignature(owner, null, index, route.method, route.path),
      });
    }
    ts.forEachChild(node, visit);
  }
}

function routeCall(
  node: ts.Node,
): { method: string; path: string; handler: ts.Node; symbol: string } | null {
  if (!ts.isCallExpression(node) || node.arguments.length < 2) return null;
  const callee = calleeName(node.expression);
  if (!callee || !ROUTE_CALLEES.test(callee.member)) return null;
  const path = routeLiteral(node.arguments[0]!);
  const handler = node.arguments.at(-1)!;
  if (path === null || !handlerLike(handler)) return null;
  return {
    method: methodFrom(callee.member),
    path,
    handler,
    symbol: ts.isIdentifier(handler) ? handler.text : callee.text,
  };
}

function calleeName(expression: ts.Expression): { text: string; member: string } | null {
  if (ts.isIdentifier(expression)) return { text: expression.text, member: expression.text };
  if (!ts.isPropertyAccessExpression(expression)) return null;
  const host = ts.isIdentifier(expression.expression) ? expression.expression.text : 'route';
  return { text: `${host}.${expression.name.text}`, member: expression.name.text };
}

function routeLiteral(node: ts.Expression): string | null {
  const raw = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : ts.isTemplateExpression(node)
      ? node.head.text
      : null;
  if (raw === null || !raw.startsWith('/') || raw.length < 2) return null;
  return raw.replace(/:([A-Za-z0-9_]+)\??/g, '{$1}').replace(/\*/g, '{rest}').replace(/\/$/, '') || '/';
}

function handlerLike(node: ts.Expression): boolean {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isIdentifier(node) ||
    ts.isCallExpression(node) || ts.isPropertyAccessExpression(node);
}

function methodFrom(member: string): string {
  const match = member.match(METHOD_IN_NAME);
  return match ? match[1]!.toUpperCase() : 'ANY';
}

function webSocketEndpoints(index: ApiSourceIndex): ApiEndpoint[] {
  return [...index.files.values()].flatMap((file) => webSocketsFrom(file, index));
}

function webSocketsFrom(file: IndexedApiFile, index: ApiSourceIndex): ApiEndpoint[] {
  if (!file.source.includes('WebSocketServer') || !file.source.includes("'upgrade'")) return [];
  return [...file.declarations]
    .filter((entry): entry is [string, ts.VariableDeclaration] => socketPathVariable(entry[1]))
    .map(([symbol, node]) => {
      const path = (node.initializer as ts.StringLiteral).text;
      const owner = upgradeOwner(file, symbol) ?? { file, node, symbol };
      return {
        method: 'WS',
        path,
        transport: 'websocket' as const,
        code: apiCodeTree(owner, index, 'WS'),
        consumers: [],
        signature: apiRouteSignature(owner, null, index, 'WS', path),
      };
    });
}

function socketPathVariable(node: ts.Node): node is ts.VariableDeclaration {
  return ts.isVariableDeclaration(node) &&
    node.initializer !== undefined &&
    ts.isStringLiteral(node.initializer) &&
    node.initializer.text.startsWith('/') &&
    node.initializer.text.length > 1;
}

function upgradeOwner(file: IndexedApiFile, pathSymbol: string): ApiDeclarationRef | null {
  for (const [symbol, node] of file.declarations) {
    if (!ts.isFunctionDeclaration(node) || !node.body) continue;
    const source = node.getText(file.ast);
    if (source.includes(pathSymbol) && source.includes("'upgrade'")) return { file, node, symbol };
  }
  return null;
}

function routeRegistrations(index: ApiSourceIndex): Map<string, ApiDeclarationRef> {
  const registrations = new Map<string, ApiDeclarationRef>();
  for (const file of index.files.values()) {
    if (file.source.includes('registerRoute(')) collectRouteRegistrations(file, registrations);
  }
  return registrations;
}

function collectRouteRegistrations(
  file: IndexedApiFile,
  registrations: Map<string, ApiDeclarationRef>,
): void {
  visit(file.ast);

  function visit(node: ts.Node): void {
    const registration = registrationFrom(node, file);
    if (registration) {
      for (const path of registeredPaths(registration.path)) {
        registrations.set(registrationKey(registration.method, path), registration.ref);
      }
    }
    ts.forEachChild(node, visit);
  }
}

function registeredPaths(path: string): string[] {
  return path.startsWith('/api') ? [path] : [`/api/v1${path}`, `/api${path}`, path];
}

function registrationFrom(
  node: ts.Node,
  file: IndexedApiFile,
): { method: string; path: string; ref: ApiDeclarationRef } | null {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'registerRoute') return null;
  const object = node.arguments[0];
  if (!object || !ts.isObjectLiteralExpression(object)) return null;
  const method = stringProperty(object, 'method');
  const path = stringProperty(object, 'path');
  return method && path
    ? { method, path, ref: { file, node: object, symbol: `registered ${method} ${path}` } }
    : null;
}

export function appRouterPath(filePath: string): string {
  const afterApp = filePath.replace(/^.*?(?:^|\/)app\//, '');
  const segments = afterApp.split('/').slice(0, -1)
    .filter((segment) => !segment.startsWith('(') && !segment.startsWith('@'))
    .map(routeSegment);
  return `/${segments.join('/')}`.replace(/\/$/, '') || '/';
}

export function pagesRouterPath(filePath: string): string {
  const afterPages = filePath.replace(/^.*?(?:^|\/)pages\//, '').replace(/\.(?:ts|tsx|js|jsx)$/, '');
  const segments = afterPages.split('/').filter((segment) => segment !== 'index').map(routeSegment);
  return `/${segments.join('/')}`.replace(/\/$/, '') || '/';
}

function routeSegment(segment: string): string {
  const dynamic = segment.match(/^\[\[?\.?\.?\.?([^\]]+)\]\]?$/);
  return dynamic ? `{${dynamic[1]}}` : segment;
}

function registrationKey(method: string, path: string): string {
  return `${method} ${path.replace(/\{[^}]+\}/g, '{}')}`;
}

function dedupe(endpoints: ApiEndpoint[]): ApiEndpoint[] {
  const seen = new Map<string, ApiEndpoint>();
  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.path}`;
    if (!seen.has(key)) seen.set(key, endpoint);
  }
  return [...seen.values()];
}
