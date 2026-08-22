import ts from 'typescript';
import { apiLineOf, resolveApiDeclaration, resolveApiModuleFile } from './apiSourceIndex';
import type { ApiDeclarationRef, ApiOutputType, ApiSourceIndex, IndexedApiFile } from './apiEndpointTypes';

const MAX_DEPTH = 5;
const MAX_REEXPORT_HOPS = 3;

interface TypeRef {
  file: IndexedApiFile;
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration;
  name: string;
}

export function responseBodyTypes(
  response: ts.Expression,
  ref: ApiDeclarationRef,
  index: ApiSourceIndex,
): ApiOutputType[] {
  const found = new Map<string, ApiOutputType>();
  const entered = new Set<ts.Node>();
  collectExpression(response, ref, '', 0);
  return [...found.values()];

  function remember(type: TypeRef, through: string): TypeRef {
    const key = `${type.file.path}:${type.name}`;
    if (!found.has(key)) {
      found.set(key, { name: type.name, file: type.file.path, line: apiLineOf(type.file, type.node), through });
    }
    return type;
  }

  function collectTypeNode(type: ts.TypeNode, file: IndexedApiFile, through: string): TypeRef[] {
    const refs: TypeRef[] = [];
    visit(type);
    return refs;

    function visit(node: ts.Node): void {
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
        const resolved = resolveApiTypeDeclaration(file, node.typeName.text, index);
        if (resolved) refs.push(remember(resolved, through));
      }
      ts.forEachChild(node, visit);
    }
  }

  function collectExpression(
    expression: ts.Expression,
    current: ApiDeclarationRef,
    through: string,
    depth: number,
  ): TypeRef[] {
    if (depth > MAX_DEPTH) return [];
    if (ts.isSatisfiesExpression(expression) || ts.isAsExpression(expression)) {
      const refs = collectTypeNode(expression.type, current.file, through);
      collectExpression(expression.expression, current, through, depth);
      return refs;
    }
    if (ts.isParenthesizedExpression(expression) || ts.isAwaitExpression(expression) || ts.isNonNullExpression(expression)) {
      return collectExpression(expression.expression, current, through, depth);
    }
    if (ts.isObjectLiteralExpression(expression)) {
      for (const property of expression.properties) collectProperty(property, current, through, depth);
      return [];
    }
    if (ts.isArrayLiteralExpression(expression)) {
      for (const element of expression.elements) collectExpression(element, current, through, depth);
      return [];
    }
    if (ts.isSpreadElement(expression)) return collectExpression(expression.expression, current, through, depth);
    if (ts.isConditionalExpression(expression)) {
      return [
        ...collectExpression(expression.whenTrue, current, through, depth),
        ...collectExpression(expression.whenFalse, current, through, depth),
      ];
    }
    if (ts.isBinaryExpression(expression) && fallsBack(expression.operatorToken.kind)) {
      return [
        ...collectExpression(expression.left, current, through, depth),
        ...collectExpression(expression.right, current, through, depth),
      ];
    }
    if (ts.isCallExpression(expression)) return collectCall(expression, current, through, depth);
    if (ts.isIdentifier(expression)) return collectIdentifier(expression, current, through, depth);
    if (ts.isPropertyAccessExpression(expression)) return collectMember(expression, current, through, depth);
    return [];
  }

  function collectProperty(
    property: ts.ObjectLiteralElementLike,
    current: ApiDeclarationRef,
    through: string,
    depth: number,
  ): void {
    if (ts.isPropertyAssignment(property)) collectExpression(property.initializer, current, through, depth);
    if (ts.isShorthandPropertyAssignment(property)) collectIdentifier(property.name, current, through, depth);
    if (ts.isSpreadAssignment(property)) collectExpression(property.expression, current, through, depth);
  }

  function collectCall(
    call: ts.CallExpression,
    current: ApiDeclarationRef,
    through: string,
    depth: number,
  ): TypeRef[] {
    const body = responseBodyArgument(call);
    if (body) return collectExpression(body, current, through, depth);
    const callee = call.expression;
    if (ts.isIdentifier(callee)) {
      const declaration = resolveApiDeclaration(current.file, callee.text, index);
      return declaration ? collectFunction(declaration, through || callee.text, depth) : [];
    }
    if (!ts.isPropertyAccessExpression(callee)) return [];
    const receiverTypes = collectExpression(callee.expression, current, through, depth + 1);
    const refs = receiverTypes.flatMap((type) => memberTypes(type, callee.name.text, through));
    for (const argument of call.arguments) {
      if (ts.isIdentifier(argument)) refs.push(...collectIdentifier(argument, current, through, depth));
    }
    return refs;
  }

  function collectFunction(declaration: ApiDeclarationRef, through: string, depth: number): TypeRef[] {
    const callable = callableOf(declaration.node);
    if (!callable || entered.has(callable) || depth > MAX_DEPTH) return [];
    entered.add(callable);
    const refs: TypeRef[] = [];
    for (const parameter of callable.parameters) {
      if (parameter.type) refs.push(...collectTypeNode(parameter.type, declaration.file, through));
    }
    const returned = returnedExpressions(callable);
    if (callable.type && !returned.some(buildsResponse)) {
      return [...refs, ...collectTypeNode(callable.type, declaration.file, through)];
    }
    for (const expression of returned) refs.push(...collectExpression(expression, declaration, through, depth + 1));
    return refs;
  }

  function collectIdentifier(
    identifier: ts.Identifier,
    current: ApiDeclarationRef,
    through: string,
    depth: number,
  ): TypeRef[] {
    const parameter = enclosingParameter(identifier);
    if (parameter) return parameter.type ? collectTypeNode(parameter.type, current.file, through) : [];
    const declaration = resolveApiDeclaration(current.file, identifier.text, index);
    if (!declaration || declaration.node === current.node) return [];
    if (callableOf(declaration.node)) return collectFunction(declaration, through || identifier.text, depth);
    if (!ts.isVariableDeclaration(declaration.node)) return [];
    if (declaration.node.type) return collectTypeNode(declaration.node.type, declaration.file, through);
    return declaration.node.initializer
      ? collectExpression(declaration.node.initializer, declaration, through, depth + 1)
      : [];
  }

  function collectMember(
    access: ts.PropertyAccessExpression,
    current: ApiDeclarationRef,
    through: string,
    depth: number,
  ): TypeRef[] {
    const receiverTypes = collectExpression(access.expression, current, through, depth + 1);
    return receiverTypes.flatMap((type) => memberTypes(type, access.name.text, through));
  }

  function memberTypes(type: TypeRef, member: string, through: string): TypeRef[] {
    const property = memberOf(type.node, member);
    return property?.type ? collectTypeNode(property.type, type.file, through) : [];
  }
}

function buildsResponse(expression: ts.Expression): boolean {
  return ts.isCallExpression(expression) && responseBodyArgument(expression) !== null;
}

function responseBodyArgument(call: ts.CallExpression): ts.Expression | null {
  const callee = call.expression;
  if (ts.isIdentifier(callee) && callee.text === 'json') return call.arguments[1] ?? null;
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'json' &&
    ts.isIdentifier(callee.expression) && callee.expression.text === 'Response') {
    return call.arguments[0] ?? null;
  }
  return null;
}

function callableOf(node: ts.Node): ts.SignatureDeclaration | null {
  if (ts.isFunctionDeclaration(node)) return node;
  if (ts.isVariableDeclaration(node) && node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
    return node.initializer;
  }
  return null;
}

function returnedExpressions(callable: ts.SignatureDeclaration): ts.Expression[] {
  const body = (callable as ts.FunctionLikeDeclaration).body;
  if (!body) return [];
  if (!ts.isBlock(body)) return [body];
  const returned: ts.Expression[] = [];
  visit(body);
  return returned;

  function visit(node: ts.Node): void {
    if (ts.isReturnStatement(node) && node.expression) returned.push(node.expression);
    if (ts.isFunctionLike(node)) return;
    ts.forEachChild(node, visit);
  }
}

function enclosingParameter(identifier: ts.Identifier): ts.ParameterDeclaration | null {
  for (let node: ts.Node | undefined = identifier.parent; node; node = node.parent) {
    if (!ts.isFunctionLike(node)) continue;
    const parameter = node.parameters.find((candidate) =>
      ts.isIdentifier(candidate.name) && candidate.name.text === identifier.text,
    );
    if (parameter) return parameter;
  }
  return null;
}

function memberOf(
  declaration: TypeRef['node'],
  member: string,
): ts.PropertySignature | ts.MethodSignature | null {
  const members = ts.isInterfaceDeclaration(declaration)
    ? declaration.members
    : ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type)
      ? declaration.type.members
      : null;
  const found = members?.find((candidate) =>
    (ts.isPropertySignature(candidate) || ts.isMethodSignature(candidate)) &&
    candidate.name && ts.isIdentifier(candidate.name) && candidate.name.text === member,
  );
  return found && (ts.isPropertySignature(found) || ts.isMethodSignature(found)) ? found : null;
}

function fallsBack(operator: ts.SyntaxKind): boolean {
  return operator === ts.SyntaxKind.QuestionQuestionToken || operator === ts.SyntaxKind.BarBarToken;
}

function resolveApiTypeDeclaration(
  file: IndexedApiFile,
  name: string,
  index: ApiSourceIndex,
  hops: number = 0,
): TypeRef | null {
  const local = typeStatementIn(file, name);
  if (local) return { file, node: local, name };
  const imported = file.imports.get(name);
  if (!imported) return null;
  const source = resolveApiModuleFile(file, imported.module, index);
  return source ? exportedTypeFrom(source, imported.imported, index, hops) : null;
}

function exportedTypeFrom(
  file: IndexedApiFile,
  name: string,
  index: ApiSourceIndex,
  hops: number,
): TypeRef | null {
  const local = typeStatementIn(file, name);
  if (local) return { file, node: local, name };
  if (hops >= MAX_REEXPORT_HOPS) return null;
  for (const statement of file.ast.statements) {
    const forwarded = reexport(statement, name);
    if (!forwarded) continue;
    const source = resolveApiModuleFile(file, forwarded.module, index);
    const resolved = source ? exportedTypeFrom(source, forwarded.name, index, hops + 1) : null;
    if (resolved) return resolved;
  }
  return null;
}

function reexport(statement: ts.Statement, name: string): { name: string; module: string } | null {
  if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
    return null;
  }
  const module = statement.moduleSpecifier.text;
  if (!statement.exportClause) return { name, module };
  if (!ts.isNamedExports(statement.exportClause)) return null;
  const element = statement.exportClause.elements.find((candidate) => candidate.name.text === name);
  return element ? { name: element.propertyName?.text ?? element.name.text, module } : null;
}

function typeStatementIn(file: IndexedApiFile, name: string): TypeRef['node'] | null {
  for (const statement of file.ast.statements) {
    if ((ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) &&
      statement.name.text === name) {
      return statement;
    }
  }
  return null;
}
