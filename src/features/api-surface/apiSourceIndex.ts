import ts from 'typescript';
import type { CodebaseFile } from '@/features/codebases/codebaseSource';
import type {
  ApiDeclarationRef,
  ApiImportRef,
  ApiSourceIndex,
  IndexedApiFile,
} from './apiEndpointTypes';

const JAVASCRIPT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export function buildApiSourceIndex(sources: CodebaseFile[]): ApiSourceIndex {
  const files = new Map<string, IndexedApiFile>();
  for (const file of sources) {
    if (!JAVASCRIPT_EXTENSIONS.some((extension) => file.path.endsWith(extension))) continue;
    files.set(file.path, parsedOnDemand(file));
  }
  return { files };
}

function parsedOnDemand(file: CodebaseFile): IndexedApiFile {
  let ast: ts.SourceFile | null = null;
  let declarations: Map<string, ts.Node> | null = null;
  let imports: Map<string, ApiImportRef> | null = null;
  const indexed = { path: file.path, source: file.source } as IndexedApiFile;
  Object.defineProperties(indexed, {
    ast: {
      get: () => ast ??= ts.createSourceFile(file.path, file.source, ts.ScriptTarget.Latest, true, scriptKind(file.path)),
    },
    declarations: { get: () => declarations ??= declarationsIn(indexed.ast) },
    imports: { get: () => imports ??= importsIn(indexed.ast) },
  });
  return indexed;
}

export function joinModulePath(from: string, relativeModule: string): string {
  const segments = from.split('/').slice(0, -1);
  for (const segment of relativeModule.split('/')) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.join('/');
}

export function resolveApiDeclaration(
  file: IndexedApiFile,
  name: string,
  index: ApiSourceIndex,
): ApiDeclarationRef | null {
  const local = file.declarations.get(name);
  if (local) return { file, node: local, symbol: name };
  const imported = file.imports.get(name);
  if (!imported) return null;
  const importedFile = resolveApiModuleFile(file, imported.module, index);
  if (!importedFile) return null;
  const declaration = importedFile.declarations.get(imported.imported);
  return declaration ? { file: importedFile, node: declaration, symbol: imported.imported } : null;
}

export function apiLineOf(file: IndexedApiFile, node: ts.Node): number {
  return file.ast.getLineAndCharacterOfPosition(node.getStart(file.ast)).line + 1;
}

export function apiExcerptOf(file: IndexedApiFile, node: ts.Node, maxLines: number = 5): string {
  const start = apiLineOf(file, node) - 1;
  const lines = file.source.split(/\r?\n/).slice(start, start + maxLines);
  const content = lines.filter((line) => line.trim() !== '');
  const indent = content.length === 0 ? 0 : Math.min(...content.map((line) => line.match(/^\s*/)![0].length));
  return lines.map((line) => line.slice(indent).trimEnd()).join('\n');
}

export function apiPropertyName(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}

function declarationsIn(ast: ts.SourceFile): Map<string, ts.Node> {
  const declarations = new Map<string, ts.Node>();
  visit(ast);
  return declarations;

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name) remember(node.name.text, node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) remember(node.name.text, node);
    ts.forEachChild(node, visit);
  }

  function remember(name: string, node: ts.Node): void {
    const held = declarations.get(name);
    if (!held || isTopLevel(node)) declarations.set(name, node);
  }
}

function importsIn(ast: ts.SourceFile): Map<string, ApiImportRef> {
  const imports = new Map<string, ApiImportRef>();
  for (const statement of ast.statements) addImportsFrom(statement, imports);
  return imports;
}

function addImportsFrom(statement: ts.Statement, imports: Map<string, ApiImportRef>): void {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return;
  const clause = statement.importClause;
  if (!clause) return;
  const module = statement.moduleSpecifier.text;
  if (clause.name) imports.set(clause.name.text, { imported: 'default', module });
  const bindings = clause.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) return;
  for (const element of bindings.elements) {
    imports.set(element.name.text, { imported: element.propertyName?.text ?? element.name.text, module });
  }
}

export function resolveApiModuleFile(file: IndexedApiFile, module: string, index: ApiSourceIndex): IndexedApiFile | null {
  for (const base of moduleBases(file, module)) {
    for (const candidate of moduleCandidates(base)) {
      const found = index.files.get(candidate);
      if (found) return found;
    }
  }
  return aliasedModule(module, index);
}

function moduleBases(file: IndexedApiFile, module: string): string[] {
  if (module.startsWith('.')) return [joinModulePath(file.path, module)];
  const aliased = module.match(/^(?:@|~|#)\/(.+)$/);
  if (aliased) return [`src/${aliased[1]}`, aliased[1]!, `app/${aliased[1]}`];
  return [];
}

function aliasedModule(module: string, index: ApiSourceIndex): IndexedApiFile | null {
  const bare = module.replace(/^(?:@|~|#)\//, '').replace(/^\.\//, '');
  if (bare.length < 4 || bare.startsWith('.')) return null;
  for (const candidate of moduleCandidates(bare)) {
    for (const [path, file] of index.files) {
      if (path === candidate || path.endsWith(`/${candidate}`)) return file;
    }
  }
  return null;
}

function moduleCandidates(base: string): string[] {
  const stripped = base.replace(/\.(?:js|jsx|mjs|cjs)$/, '');
  return [
    base,
    ...JAVASCRIPT_EXTENSIONS.map((extension) => `${stripped}${extension}`),
    ...JAVASCRIPT_EXTENSIONS.map((extension) => `${stripped}/index${extension}`),
  ];
}

function isTopLevel(node: ts.Node): boolean {
  return ts.isSourceFile(node.parent) ||
    (ts.isVariableDeclaration(node) && ts.isVariableStatement(node.parent.parent));
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (/\.(?:js|mjs|cjs)$/.test(path)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
