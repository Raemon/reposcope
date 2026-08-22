import ts from 'typescript';
import { responseBodyTypes } from './apiResponseTypes';
import { apiPropertyName, resolveApiDeclaration } from './apiSourceIndex';
import type {
  ApiDeclarationRef,
  ApiInput,
  ApiInputSource,
  ApiOutput,
  ApiOutputField,
  ApiSignature,
  ApiSourceIndex,
} from './apiEndpointTypes';

const MAX_DEPTH = 5;
const MAX_DECLARATIONS = 40;
const HTTP_METHOD_KEYS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const KIND_TYPES: Readonly<Record<string, string>> = {
  int: 'int',
  number: 'number',
  text: 'string',
  nodeId: 'nodeId',
  json: 'json',
};

export function apiRouteSignature(
  handler: ApiDeclarationRef,
  registration: ApiDeclarationRef | null,
  index: ApiSourceIndex,
  method: string,
  path: string,
): ApiSignature {
  const declared = registration ? declaredContract(registration.node) : null;
  const scanned = scanResponses(registration ?? handler, index, method);
  return {
    summary: declared?.summary ?? '',
    inputs: [...pathInputs(path), ...(declared ? declared.inputs : scanned.inputs)],
    outputs: scanned.outputs,
  };
}

function pathInputs(path: string): ApiInput[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1]!,
    type: 'string',
    source: 'path' as const,
    optional: false,
    help: '',
  }));
}

function declaredContract(
  node: ts.Node,
): { summary: string; inputs: ApiInput[] } | null {
  if (!ts.isObjectLiteralExpression(node)) return null;
  return {
    summary: stringProperty(node, 'summary') ?? '',
    inputs: [...declaredInputs(node, 'body'), ...declaredInputs(node, 'query')],
  };
}

function declaredInputs(object: ts.ObjectLiteralExpression, source: ApiInputSource): ApiInput[] {
  const specs = propertyValue(object, source);
  if (!specs || !ts.isObjectLiteralExpression(specs)) return [];
  return specs.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) return [];
    const name = apiPropertyName(property.name);
    if (!name) return [];
    const kind = stringProperty(property.initializer, 'kind') ?? 'text';
    return [{
      name,
      type: KIND_TYPES[kind] ?? kind,
      source,
      optional: propertyValue(property.initializer, 'optional')?.kind === ts.SyntaxKind.TrueKeyword,
      help: stringProperty(property.initializer, 'help') ?? '',
    }];
  });
}

function scanResponses(
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
  method: string,
): { inputs: ApiInput[]; outputs: ApiOutput[] } {
  const inputs = new Map<string, ApiInput>();
  const outputs = new Map<string, ApiOutput>();
  const visited = new Set<string>();
  let budget = MAX_DECLARATIONS;

  walk(ref, 0);
  return {
    inputs: [...inputs.values()],
    outputs: [...outputs.values()].sort((left, right) => left.status - right.status),
  };

  function walk(current: ApiDeclarationRef, depth: number): void {
    const identity = `${current.file.path}:${current.node.pos}`;
    if (visited.has(identity) || budget <= 0) return;
    visited.add(identity);
    budget -= 1;
    visit(current.node);

    function visit(node: ts.Node): void {
      const chosen = methodBranch(node, method);
      if (chosen) {
        visit(chosen);
        return;
      }
      if (ts.isCallExpression(node)) {
        rememberInput(node, current);
        const output = outputFrom(node, current, index);
        if (output) outputs.set(outputKey(output), output);
      }
      if (depth < MAX_DEPTH) follow(node, current, depth);
      ts.forEachChild(node, visit);
    }
  }

  function follow(node: ts.Node, current: ApiDeclarationRef, depth: number): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      followName(node.expression.text, current, depth);
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      followName(node.expression.text, current, depth);
    }
  }

  function followName(name: string, current: ApiDeclarationRef, depth: number): void {
    const declaration = resolveApiDeclaration(current.file, name, index);
    if (declaration && declaration.node !== current.node) walk(declaration, depth + 1);
  }

  function rememberInput(node: ts.CallExpression, current: ApiDeclarationRef): void {
    const input = inputFrom(node, current, index);
    if (input) inputs.set(`${input.source}:${input.name}`, input);
  }
}

function methodBranch(node: ts.Node, method: string): ts.Node | null {
  if (!ts.isObjectLiteralExpression(node)) return null;
  const names = node.properties.map((property) => property.name ? apiPropertyName(property.name) : null);
  if (!names.some((name) => name !== null && HTTP_METHOD_KEYS.has(name))) return null;
  const index = names.indexOf(method);
  return index === -1 ? null : node.properties[index]!;
}

function inputFrom(
  node: ts.CallExpression,
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
): ApiInput | null {
  const callee = node.expression;
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'json' && requestLike(callee.expression)) {
    return { name: 'body', type: 'json', source: 'body', optional: false, help: '' };
  }
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'get') return null;
  const argument = node.arguments[0];
  const container = callee.expression;
  if (!argument || !ts.isStringLiteral(argument)) return null;
  if (ts.isPropertyAccessExpression(container) && container.name.text === 'headers') {
    return { name: headerName(argument.text), type: 'string', source: 'header', optional: false, help: '' };
  }
  if (searchParamsLike(container, ref, index)) {
    return { name: argument.text, type: 'string', source: 'query', optional: true, help: '' };
  }
  return null;
}

function searchParamsLike(node: ts.Node, ref: ApiDeclarationRef, index: ApiSourceIndex): boolean {
  if (ts.isPropertyAccessExpression(node)) return node.name.text === 'searchParams' || node.name.text === 'query';
  if (!ts.isIdentifier(node)) return false;
  const declaration = resolveApiDeclaration(ref.file, node.text, index);
  return declaration !== null &&
    ts.isVariableDeclaration(declaration.node) &&
    (declaration.node.initializer?.getText(declaration.file.ast).includes('searchParams') ?? false);
}

function requestLike(node: ts.Node): boolean {
  return ts.isIdentifier(node) && /^(request|req)$/.test(node.text);
}

function outputFrom(node: ts.CallExpression, ref: ApiDeclarationRef, index: ApiSourceIndex): ApiOutput | null {
  const shape = outputShape(node, ref);
  return shape ? { ...shape, types: responseBodyTypes(node, ref, index) } : null;
}

function outputShape(node: ts.CallExpression, ref: ApiDeclarationRef): Omit<ApiOutput, 'types'> | null {
  const callee = node.expression;
  if (ts.isIdentifier(callee) && callee.text === 'json') return jsonOutput(node, ref);
  if (ts.isIdentifier(callee) && callee.text === 'failure') {
    return { status: literalStatus(node.arguments[0]) ?? 400, type: 'object', fields: FAILURE_FIELDS };
  }
  if (ts.isIdentifier(callee) && callee.text === 'apiError') {
    return { status: literalStatus(node.arguments[0]) ?? 400, type: 'object', fields: [{ name: 'error', type: 'object' }] };
  }
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'json' &&
    ts.isIdentifier(callee.expression) && callee.expression.text === 'Response') {
    return responseJsonOutput(node, ref);
  }
  return null;
}

function jsonOutput(node: ts.CallExpression, ref: ApiDeclarationRef): Omit<ApiOutput, 'types'> | null {
  const status = literalStatus(node.arguments[0]);
  const body = node.arguments[1];
  if (status === null || !body) return null;
  return { status, ...bodyShape(body, ref) };
}

function responseJsonOutput(node: ts.CallExpression, ref: ApiDeclarationRef): Omit<ApiOutput, 'types'> | null {
  const body = node.arguments[0];
  if (!body) return null;
  const options = node.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return { status: 200, ...bodyShape(body, ref) };
  if (!namesProperty(options, 'status')) return { status: 200, ...bodyShape(body, ref) };
  const status = literalStatus(propertyValue(options, 'status'));
  return status === null ? null : { status, ...bodyShape(body, ref) };
}

function bodyShape(body: ts.Expression, ref: ApiDeclarationRef): { type: string; fields: ApiOutputField[] } {
  if (!ts.isObjectLiteralExpression(body)) return { type: bodyType(body, ref), fields: [] };
  return { type: 'object', fields: body.properties.flatMap((property) => outputField(property, ref)) };
}

function bodyType(body: ts.Expression, ref: ApiDeclarationRef): string {
  const inferred = expressionType(body, ref);
  return inferred === 'unknown' ? body.getText(ref.file.ast).split('\n')[0]!.slice(0, 48) : inferred;
}

function outputField(property: ts.ObjectLiteralElementLike, ref: ApiDeclarationRef): ApiOutputField[] {
  if (ts.isShorthandPropertyAssignment(property)) {
    return [{ name: property.name.text, type: 'unknown' }];
  }
  if (!ts.isPropertyAssignment(property)) return [];
  const name = apiPropertyName(property.name);
  return name ? [{ name, type: expressionType(property.initializer, ref) }] : [];
}

function expressionType(expression: ts.Expression, ref: ApiDeclarationRef): string {
  if (ts.isStringLiteral(expression) || ts.isTemplateExpression(expression)) return 'string';
  if (ts.isNumericLiteral(expression)) return 'number';
  if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
  if (ts.isArrayLiteralExpression(expression)) return 'array';
  if (ts.isObjectLiteralExpression(expression)) return 'object';
  const text = expression.getText(ref.file.ast);
  if (/\.map\(|\.filter\(|^\[/.test(text)) return 'array';
  if (/^Object\.fromEntries\(/.test(text)) return 'object';
  return 'unknown';
}

const FAILURE_FIELDS: ApiOutputField[] = [
  { name: 'error', type: 'string' },
  { name: 'meaning', type: 'string' },
  { name: 'recovery', type: 'string' },
  { name: 'hint', type: 'string' },
];

function headerName(header: string): string {
  return header.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
}

function outputKey(output: ApiOutput): string {
  return `${output.status}:${output.type}:${output.fields.map((field) => field.name).join(',')}`;
}

function literalStatus(node: ts.Node | undefined): number | null {
  return node && ts.isNumericLiteral(node) ? Number(node.text) : null;
}

function namesProperty(object: ts.ObjectLiteralExpression, name: string): boolean {
  return object.properties.some((property) => property.name !== undefined && apiPropertyName(property.name) === name);
}

function propertyValue(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const property = object.properties.find((candidate) =>
    ts.isPropertyAssignment(candidate) && apiPropertyName(candidate.name) === name,
  );
  return property && ts.isPropertyAssignment(property) ? property.initializer : undefined;
}

function stringProperty(object: ts.ObjectLiteralExpression, name: string): string | null {
  const value = propertyValue(object, name);
  if (!value) return null;
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  return null;
}
