import ts from 'typescript';
import { apiExcerptOf, apiLineOf, hasModifier, resolveApiModuleFile } from './apiSourceIndex';
import { codeSteps, type ApiEndpoint, type ApiSourceIndex, type IndexedApiFile } from './apiEndpointTypes';

type ApiTypeKind = 'interface' | 'type' | 'enum';

export interface ApiTypeEntry {
  name: string;
  kind: ApiTypeKind;
  file: string;
  line: number;
  excerpt: string;
  exported: boolean;
  reachedByApi: boolean;
}

const EXCERPT_LINES = 12;

const TYPE_DECLARATION = /\b(?:interface|type|enum)\s+[A-Za-z_$]/;

export function buildApiTypeCatalog(index: ApiSourceIndex, endpoints: ApiEndpoint[]): ApiTypeEntry[] {
  return orderByApiIntroduction(typesByFile(index), index, endpoints);
}

function orderByApiIntroduction(
  byFile: Map<string, ApiTypeEntry[]>,
  index: ApiSourceIndex,
  endpoints: ApiEndpoint[],
): ApiTypeEntry[] {
  const ordered: ApiTypeEntry[] = [];
  const taken = new Set<string>();

  for (const endpoint of endpoints) {
    for (const step of codeSteps(endpoint.code)) {
      takeFile(step.file, true);
      for (const imported of importedFilePaths(step.file, index)) takeFile(imported, true);
    }
  }
  for (const path of [...byFile.keys()].sort()) takeFile(path, false);
  return ordered;

  function takeFile(path: string, reachedByApi: boolean): void {
    if (taken.has(path)) return;
    taken.add(path);
    for (const entry of byFile.get(path) ?? []) ordered.push({ ...entry, reachedByApi });
  }
}

function importedFilePaths(path: string, index: ApiSourceIndex): string[] {
  const file = index.files.get(path);
  if (!file) return [];
  const paths: string[] = [];
  for (const reference of file.imports.values()) {
    const imported = resolveApiModuleFile(file, reference.module, index);
    if (imported && !paths.includes(imported.path)) paths.push(imported.path);
  }
  return paths;
}

function typesByFile(index: ApiSourceIndex): Map<string, ApiTypeEntry[]> {
  const byFile = new Map<string, ApiTypeEntry[]>();
  for (const file of index.files.values()) {
    if (!TYPE_DECLARATION.test(file.source)) continue;
    const entries = file.ast.statements.flatMap((statement) => typeEntry(file, statement));
    if (entries.length > 0) byFile.set(file.path, entries);
  }
  return byFile;
}

function typeEntry(file: IndexedApiFile, statement: ts.Statement): ApiTypeEntry[] {
  const kind = typeKind(statement);
  if (!kind) return [];
  const named = statement as ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration;
  return [{
    name: named.name.text,
    kind,
    file: file.path,
    line: apiLineOf(file, statement),
    excerpt: apiExcerptOf(file, statement, declarationLines(file, statement)),
    exported: hasModifier(statement, ts.SyntaxKind.ExportKeyword),
    reachedByApi: false,
  }];
}

function declarationLines(file: IndexedApiFile, statement: ts.Statement): number {
  const start = apiLineOf(file, statement);
  const end = file.ast.getLineAndCharacterOfPosition(statement.getEnd()).line + 1;
  return Math.min(EXCERPT_LINES, end - start + 1);
}

function typeKind(statement: ts.Statement): ApiTypeKind | null {
  if (ts.isInterfaceDeclaration(statement)) return 'interface';
  if (ts.isTypeAliasDeclaration(statement)) return 'type';
  if (ts.isEnumDeclaration(statement)) return 'enum';
  return null;
}
