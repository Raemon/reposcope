import ts from 'typescript';
import {
  apiExcerptOf,
  apiLineOf,
  apiPropertyName,
  resolveApiDeclaration,
  stringProperty,
} from './apiSourceIndex';
import {
  codeSteps,
  type ApiConsumer,
  type ApiConsumerCandidate,
  type ApiDeclarationRef,
  type ApiEndpoint,
  type ApiSourceIndex,
  type IndexedApiFile,
} from './apiEndpointTypes';

export function findApiConsumers(
  endpoint: ApiEndpoint,
  candidates: ApiConsumerCandidate[],
): ApiConsumer[] {
  const endpointShape = pathShape(endpoint.path);
  const implementationFiles = new Set(codeSteps(endpoint.code).map((step) => step.file));
  return uniqueConsumers(candidates
    .filter((candidate) => !implementationFiles.has(candidate.file))
    .filter((candidate) => pathShape(candidate.path) === endpointShape)
    .filter((candidate) => candidate.method === null || endpoint.method === candidate.method)
    .map(({ method: _method, path: _path, ...consumer }) => consumer));
}

const CONSUMER_HINT = /\bfetch\s*\(|new WebSocket|href=|axios|useSWR|useQuery/;

export function findApiConsumerCandidates(index: ApiSourceIndex): ApiConsumerCandidate[] {
  const candidates: ApiConsumerCandidate[] = [];
  for (const file of index.files.values()) {
    if (consumerFileIsExcluded(file.path) || !CONSUMER_HINT.test(file.source)) continue;
    collectCandidates(file, index, candidates);
  }
  return candidates;
}

function collectCandidates(
  file: IndexedApiFile,
  index: ApiSourceIndex,
  candidates: ApiConsumerCandidate[],
): void {
  visit(file.ast);

  function visit(node: ts.Node): void {
    const method = consumerMethod(node);
    const path = pathValue(node, file, index, method !== null);
    const owner = path ? nearestNamedOwner(node, file) : null;
    if (path && owner && (method !== null || isPathTable(owner.node))) {
      candidates.push(consumerCandidate(path, method, node, owner));
    }
    ts.forEachChild(node, visit);
  }

  function consumerCandidate(
    path: string,
    method: string | null,
    node: ts.Node,
    owner: ApiDeclarationRef,
  ): ApiConsumerCandidate {
    return {
      symbol: owner.symbol,
      file: file.path,
      line: apiLineOf(file, node),
      excerpt: apiExcerptOf(file, isPathTable(owner.node) ? node : owner.node, 3),
      method,
      path,
    };
  }
}

function pathValue(
  node: ts.Node,
  file: IndexedApiFile,
  index: ApiSourceIndex,
  mayResolveIdentifier: boolean,
): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return requestPath(node.text);
  }
  if (ts.isTemplateExpression(node)) return apiPathInTemplate(node);
  if (!mayResolveIdentifier || !ts.isIdentifier(node)) return null;
  const declaration = resolveApiDeclaration(file, node.text, index)?.node;
  if (!declaration || !ts.isVariableDeclaration(declaration) || !declaration.initializer) return null;
  return pathValue(declaration.initializer, file, index, false);
}

function apiPathInTemplate(node: ts.TemplateExpression): string | null {
  const value = node.templateSpans.reduce(
    (held, span) => `${held}{${expressionName(span.expression)}}${span.literal.text}`,
    node.head.text,
  );
  const pathStart = value.indexOf('/');
  return pathStart < 0 ? null : requestPath(value.slice(pathStart));
}

function requestPath(value: string): string | null {
  if (!value.startsWith('/') || value.length < 4) return null;
  return value.split('#')[0]!;
}

function nearestNamedOwner(node: ts.Node, file: IndexedApiFile): ApiDeclarationRef {
  let current: ts.Node | undefined = node;
  let heldVariable: ts.VariableDeclaration | null = null;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return { file, node: current, symbol: current.name.text };
    if (ts.isMethodDeclaration(current) && current.name) {
      return { file, node: current, symbol: apiPropertyName(current.name) ?? 'method' };
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) heldVariable = current;
    current = current.parent;
  }
  if (heldVariable && ts.isIdentifier(heldVariable.name)) {
    return { file, node: heldVariable, symbol: heldVariable.name.text };
  }
  return { file, node, symbol: file.path.split('/').at(-1) ?? file.path };
}

function consumerMethod(node: ts.Node): string | null {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === 'fetch') {
      return fetchMethod(current);
    }
    if (ts.isNewExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === 'WebSocket') return 'WS';
    if (ts.isJsxAttribute(current) && ts.isIdentifier(current.name) && current.name.text === 'href') return 'GET';
    if (ts.isStatement(current)) break;
    current = current.parent;
  }
  return null;
}

function fetchMethod(call: ts.CallExpression): string {
  const options = call.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return 'GET';
  return stringProperty(options, 'method') ?? 'GET';
}

function isPathTable(node: ts.Node): boolean {
  return ts.isVariableDeclaration(node) &&
    node.initializer !== undefined &&
    ts.isObjectLiteralExpression(node.initializer);
}

function uniqueConsumers(consumers: ApiConsumer[]): ApiConsumer[] {
  const seen = new Set<string>();
  return consumers.filter((consumer) => {
    const key = `${consumer.file}:${consumer.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function consumerFileIsExcluded(path: string): boolean {
  return path.includes('/__tests__/') ||
    path.includes('/app/api/') ||
    path.includes('/pages/api/') ||
    /\.(?:test|spec)\.[a-z]+$/.test(path);
}

function pathShape(path: string): string {
  return path.split('?')[0]!.replace(/\{[^}]+\}/g, '{}');
}

function expressionName(expression: ts.Expression): string {
  return ts.isIdentifier(expression) ? expression.text : 'value';
}
