import ts from 'typescript';
import {
  apiExcerptOf,
  apiLineOf,
  apiPropertyName,
  resolveApiDeclaration,
} from './apiSourceIndex';
import type {
  ApiCodeStep,
  ApiDeclarationRef,
  ApiSourceIndex,
} from './apiEndpointTypes';

const MAX_CALL_DEPTH = 4;
const MAX_CALLS_PER_STEP = 4;
const RESPONSE_PLUMBING = new Set(['apiError', 'failure', 'failureByCode', 'json', 'methodsAllowedFor']);

export function apiCodeTree(
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
  method: string,
  depth: number = 0,
  ancestors: ReadonlySet<string> = new Set(),
): ApiCodeStep {
  const identity = declarationIdentity(ref);
  const nextAncestors = new Set(ancestors).add(identity);
  return {
    symbol: ref.symbol,
    file: ref.file.path,
    line: apiLineOf(ref.file, ref.node),
    excerpt: apiExcerptOf(ref.file, ref.node),
    calls: nextCalls(ref, index, method, depth, nextAncestors),
  };
}

export function attachApiRegistration(
  code: ApiCodeStep,
  registration: ApiDeclarationRef,
  index: ApiSourceIndex,
): void {
  const target = findCodeStep(code, 'handleApiRequest') ?? code;
  const method = registration.symbol.split(' ')[1] ?? 'GET';
  target.calls.push(apiCodeTree(registration, index, method));
}

function nextCalls(
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
  method: string,
  depth: number,
  ancestors: ReadonlySet<string>,
): ApiCodeStep[] {
  if (depth >= MAX_CALL_DEPTH) return [];
  return dependencyRefs(ref, index, method)
    .filter((dependency) => !ancestors.has(declarationIdentity(dependency)))
    .filter((dependency) => !RESPONSE_PLUMBING.has(dependency.symbol))
    .filter((dependency) => dependencyIsUseful(dependency.node, ref.node))
    .sort((left, right) => declarationPriority(left.node) - declarationPriority(right.node))
    .slice(0, MAX_CALLS_PER_STEP)
    .map((dependency) => apiCodeTree(dependency, index, method, depth + 1, ancestors));
}

function dependencyRefs(
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
  method: string,
): ApiDeclarationRef[] {
  const names = dependencyNames(ref, method);
  return [...new Set(names)]
    .map((name) => resolveApiDeclaration(ref.file, name, index))
    .filter((dependency): dependency is ApiDeclarationRef => dependency !== null && dependency.node !== ref.node);
}

function dependencyNames(ref: ApiDeclarationRef, method: string): string[] {
  const names: string[] = [];
  visit(ref.node);
  return names;

  function visit(node: ts.Node): void {
    if (node !== ref.node && functionLike(node) && !functionBelongsToRef(node, ref.node, method)) return;
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) addCalledName(node.expression, names);
    if (ts.isVariableDeclaration(ref.node) && ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      names.push(node.expression.text);
    }
    ts.forEachChild(node, visit);
  }
}

function addCalledName(expression: ts.Expression, names: string[]): void {
  if (ts.isIdentifier(expression)) names.push(expression.text);
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    names.push(expression.expression.text);
  }
}

function findCodeStep(step: ApiCodeStep, symbol: string): ApiCodeStep | null {
  if (step.symbol === symbol) return step;
  for (const call of step.calls) {
    const found = findCodeStep(call, symbol);
    if (found) return found;
  }
  return null;
}

function functionLike(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node);
}

function functionBelongsToRef(node: ts.Node, ref: ts.Node, method: string): boolean {
  if (ts.isVariableDeclaration(ref) && ref.initializer === node) return true;
  const parent = node.parent;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isCallExpression(parent) && parent.arguments.includes(node as ts.Expression)) return true;
  if (!ts.isPropertyAssignment(parent)) return false;
  const name = apiPropertyName(parent.name);
  return name === 'handle' || name === method;
}

function declarationPriority(node: ts.Node): number {
  if (ts.isFunctionDeclaration(node)) return 0;
  if (ts.isVariableDeclaration(node) && node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) return 0;
  return 1;
}

function dependencyIsUseful(dependency: ts.Node, owner: ts.Node): boolean {
  return declarationPriority(dependency) === 0 || ts.isVariableDeclaration(owner);
}

function declarationIdentity(ref: ApiDeclarationRef): string {
  return `${ref.file.path}:${ref.node.pos}:${ref.symbol}`;
}
