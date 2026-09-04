import ts from 'typescript';
import {
  isTypescriptPath,
  LIB_REF,
  type CodeIntelQuery,
  type CodeIntelResult,
  type CodePosition,
  type DefinitionSite,
  type FileRead,
  type HoverInfo,
  type ReferenceSite,
  type Source,
} from './codeIntelTypes';
import { dirOf, joinPath } from '@/features/pull-requests/relativePaths';

const LIB_NAMES = ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'];
const LIB_DIR = '/__lib';
const DEPTH_CAP = 4;
const HARD_CAP = 400;
const DEFAULT_BUDGET = 80;
const MAX_PROJECTS = 4;
const MAX_EXTENDS = 3;
const TEXT_MAX = 160;

export interface ProjectOptions {
  budget?: number;
}

export interface Projects {
  query<Q extends CodeIntelQuery>(query: Q): Promise<CodeIntelResult<Q>>;
}

export function createProjects(source: Source, options: ProjectOptions = {}): Projects {
  const budget = options.budget ?? DEFAULT_BUDGET;
  const libs = new LibStore(source);
  const registry = ts.createDocumentRegistry(true, '/');
  const held = new Map<string, Promise<Project>>();

  const projectFor = (ref: string): Promise<Project> => {
    const known = held.get(ref);
    if (known) held.delete(ref);
    const project = known ?? openProject(ref, source, libs, registry);
    held.set(ref, project);
    evictOldest(held);
    return project;
  };

  const query = async <Q extends CodeIntelQuery>(asked: Q): Promise<CodeIntelResult<Q>> => {
    const project = await projectFor(asked.ref);
    return project.whileBusy(() => runQuery(project, asked, budget)) as Promise<CodeIntelResult<Q>>;
  };
  return { query };
}

async function openProject(ref: string, source: Source, libs: LibStore, registry: ts.DocumentRegistry): Promise<Project> {
  const project = new Project(ref, source, libs, registry);
  await Promise.all([libs.ensure(), project.init()]);
  return project;
}

function evictOldest(held: Map<string, Promise<Project>>) {
  while (held.size > MAX_PROJECTS) {
    const oldest = held.keys().next().value;
    if (oldest === undefined) return;
    void held.get(oldest)?.then((project) => project.retire());
    held.delete(oldest);
  }
}

async function runQuery(project: Project, asked: CodeIntelQuery, budget: number): Promise<unknown> {
  switch (asked.op) {
    case 'warm':
      return project.warm(asked.seeds ?? [], budget);
    case 'definition':
      await project.ensure([asked.path], budget);
      return project.definition(asked);
    case 'hover':
      await project.ensure([asked.path], budget);
      return project.hover(asked);
    case 'references':
      await project.ensure([asked.path, ...(asked.seeds ?? [])], budget * 2);
      return project.references(asked);
  }
}

class LibStore {
  readonly texts = new Map<string, string>();
  private loading: Promise<void> | null = null;

  constructor(private readonly source: Source) {}

  ensure(): Promise<void> {
    this.loading ??= this.walk(LIB_NAMES);
    return this.loading;
  }

  private async walk(names: string[]) {
    let pending = names.filter((name) => !this.texts.has(name));
    while (pending.length > 0) {
      const texts = await this.source.read(LIB_REF, pending);
      pending = this.store(pending, texts);
    }
  }

  private store(names: string[], texts: FileRead[]): string[] {
    const found: string[] = [];
    names.forEach((name, at) => {
      const text = texts[at];
      if (typeof text !== 'string') throw new Error(`TypeScript lib file ${name} is missing: ${text && text.error}`);
      this.texts.set(name, text);
      for (const referenced of libReferences(text)) if (!this.texts.has(referenced)) found.push(referenced);
    });
    return unique(found);
  }
}

function libReferences(text: string): string[] {
  return ts.preProcessFile(text, false, false).libReferenceDirectives.map((held) => `lib.${held.fileName}.d.ts`);
}

class Project {
  private listing = new Set<string>();
  private directories = new Set<string>();
  private readonly loaded = new Map<string, string>();
  private readonly versions = new Map<string, string>();
  private readonly missing = new Set<string>();
  private busy = 0;
  private retired = false;
  private options: ts.CompilerOptions = {};
  private readonly service: ts.LanguageService;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly ref: string,
    private readonly source: Source,
    private readonly libs: LibStore,
    registry: ts.DocumentRegistry,
  ) {
    this.service = ts.createLanguageService(this.host(), registry);
  }

  async init() {
    const listing = await this.source.listing(this.ref);
    if (!listing) throw new Error(`no file listing for ${this.ref}`);
    this.listing = new Set(listing.files);
    this.directories = directoriesOf(this.listing);
    await this.loadConfigChain();
    this.options = this.parseOptions();
  }

  async whileBusy<T>(work: () => Promise<T>): Promise<T> {
    this.busy += 1;
    try {
      return await work();
    } finally {
      this.busy -= 1;
      if (this.retired) this.disposeWhenIdle();
    }
  }

  retire() {
    this.retired = true;
    this.disposeWhenIdle();
  }

  private disposeWhenIdle() {
    if (this.busy === 0) this.service.dispose();
  }

  async warm(seeds: string[], budget: number): Promise<null> {
    await this.ensure(seeds, budget);
    this.service.getProgram();
    return null;
  }

  ensure(paths: string[], budget: number): Promise<void> {
    const run = this.queue.then(() => this.walk(paths, budget));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async walk(roots: string[], budget: number) {
    const listed = roots.filter((path) => this.listing.has(path));
    await this.load(listed);
    await this.loadDependencyLevels(listed, budget);
  }

  private async loadDependencyLevels(level: string[], budget: number) {
    let left = budget;
    for (let depth = 0; depth < DEPTH_CAP && level.length > 0 && left > 0; depth += 1) {
      const wanted = this.unloadedDependencies(level).slice(0, Math.min(left, HARD_CAP - this.loaded.size));
      level = await this.load(wanted);
      left -= level.length;
    }
  }

  private async load(paths: string[]): Promise<string[]> {
    const wanted = unique(paths.filter((path) => !this.loaded.has(path) && !this.missing.has(path)));
    if (wanted.length === 0) return [];
    const texts = await this.source.read(this.ref, wanted);
    wanted.forEach((path, at) => this.remember(path, texts[at] ?? null));
    return wanted.filter((path) => this.loaded.has(path));
  }

  private remember(path: string, read: FileRead) {
    if (read === null) return void this.missing.add(path);
    if (typeof read !== 'string') return;
    this.loaded.set(path, read);
    this.versions.set(path, textHash(read));
  }

  private unloadedDependencies(paths: string[]): string[] {
    const found = paths.flatMap((path) => this.dependenciesOf(path));
    return unique(found.filter((path) => this.listing.has(path) && !this.loaded.has(path) && !this.missing.has(path)));
  }

  private dependenciesOf(path: string): string[] {
    const text = this.loaded.get(path);
    if (text === undefined || !isTypescriptPath(path)) return [];
    const info = ts.preProcessFile(text, true, /\.[cm]?jsx?$/.test(path));
    const imported = info.importedFiles.map((held) => this.resolveImport(held.fileName, path));
    const referenced = info.referencedFiles.map((held) => joinPath(dirOf(path), held.fileName));
    return [...imported, ...referenced].filter((held): held is string => held !== null);
  }

  private resolveImport(spec: string, from: string): string | null {
    const resolved = ts.resolveModuleName(spec, `/${from}`, this.options, this.listingHost()).resolvedModule;
    return resolved ? resolved.resolvedFileName.slice(1) : null;
  }

  private listingHost(): ts.ModuleResolutionHost {
    return {
      fileExists: (name) => this.listing.has(name.slice(1)),
      readFile: (name) => this.loaded.get(name.slice(1)),
      directoryExists: (name) => name === '/' || this.directories.has(name.slice(1)),
      getCurrentDirectory: () => '/',
      useCaseSensitiveFileNames: true,
    };
  }

  private async loadConfigChain() {
    let path: string | null = 'tsconfig.json';
    for (let hops = 0; path !== null && this.listing.has(path) && hops < MAX_EXTENDS; hops += 1) {
      await this.load([path]);
      const text = this.loaded.get(path);
      path = text === undefined ? null : relativeExtends(text, path);
    }
  }

  private parseOptions(): ts.CompilerOptions {
    const text = this.loaded.get('tsconfig.json');
    const json: unknown = text === undefined ? {} : ts.parseConfigFileTextToJson('/tsconfig.json', text).config ?? {};
    const parsed = ts.parseJsonConfigFileContent(json, this.parseHost(), '/', undefined, '/tsconfig.json');
    return { ...parsed.options, ...FORCED_OPTIONS };
  }

  private parseHost(): ts.ParseConfigHost {
    return {
      useCaseSensitiveFileNames: true,
      readDirectory: () => [],
      fileExists: (name) => this.loaded.has(name.slice(1)),
      readFile: (name) => this.loaded.get(name.slice(1)),
    };
  }

  private host(): ts.LanguageServiceHost {
    return {
      getCompilationSettings: () => this.options,
      getScriptFileNames: () => this.rootNames(),
      getScriptVersion: (name) => this.versions.get(name.slice(1)) ?? '1',
      getScriptSnapshot: (name) => snapshotOf(this.text(name)),
      getCurrentDirectory: () => '/',
      getDefaultLibFileName: (options) => `${LIB_DIR}/${ts.getDefaultLibFileName(options)}`,
      fileExists: (name) => this.text(name) !== undefined,
      readFile: (name) => this.text(name),
      directoryExists: (name) => name === '/' || name === LIB_DIR || this.directories.has(name.slice(1)),
      getDirectories: () => [],
      readDirectory: () => [],
      useCaseSensitiveFileNames: () => true,
      resolveModuleNameLiterals: (literals, from, _redirect, options) =>
        literals.map((literal) => ts.resolveModuleName(literal.text, from, options, this.loadedHost())),
    };
  }

  private loadedHost(): ts.ModuleResolutionHost {
    return {
      fileExists: (name) => this.text(name) !== undefined,
      readFile: (name) => this.text(name),
      directoryExists: (name) => name === '/' || name === LIB_DIR || this.directories.has(name.slice(1)),
      getCurrentDirectory: () => '/',
      useCaseSensitiveFileNames: true,
    };
  }

  private rootNames(): string[] {
    return [...this.loaded.keys()].filter(isTypescriptPath).map((path) => `/${path}`);
  }

  private text(name: string): string | undefined {
    if (name.startsWith(`${LIB_DIR}/`)) return this.libs.texts.get(name.slice(LIB_DIR.length + 1));
    return this.loaded.get(name.slice(1));
  }

  private located(at: CodePosition): { file: string; position: number } | null {
    const file = `/${at.path}`;
    const sourceFile = this.service.getProgram()?.getSourceFile(file);
    if (!sourceFile) return null;
    const position = offsetOf(sourceFile, at.line, at.column);
    return position === null ? null : { file, position };
  }

  definition(at: CodePosition): DefinitionSite[] {
    const found = this.located(at);
    if (!found) return [];
    const definitions = this.service.getDefinitionAtPosition(found.file, found.position) ?? [];
    return uniqueSites(definitions.flatMap((held) => this.siteOf(held)));
  }

  private siteOf(definition: ts.DefinitionInfo): DefinitionSite[] {
    const sourceFile = this.service.getProgram()?.getSourceFile(definition.fileName);
    if (!sourceFile) return [];
    const context = definition.contextSpan ?? definition.textSpan;
    return [
      {
        ...this.locate(definition.fileName),
        nameLine: lineOf(sourceFile, definition.textSpan.start),
        startLine: lineOf(sourceFile, context.start),
        endLine: lineOf(sourceFile, context.start + context.length),
      },
    ];
  }

  private locate(fileName: string): { path: string; ref: string } {
    if (fileName.startsWith(`${LIB_DIR}/`)) return { path: fileName.slice(LIB_DIR.length + 1), ref: LIB_REF };
    return { path: fileName.slice(1), ref: this.ref };
  }

  hover(at: CodePosition): HoverInfo | null {
    const found = this.located(at);
    const info = found ? this.service.getQuickInfoAtPosition(found.file, found.position) : undefined;
    if (!info) return null;
    const docs = ts.displayPartsToString(info.documentation);
    return { signature: ts.displayPartsToString(info.displayParts), docs: docs === '' ? null : docs };
  }

  references(at: CodePosition): ReferenceSite[] {
    const found = this.located(at);
    if (!found) return [];
    const symbols = this.service.findReferences(found.file, found.position) ?? [];
    const entries = symbols.flatMap((symbol) => symbol.references).filter((entry) => !entry.fileName.startsWith(LIB_DIR));
    const declared = new Set(this.definition(at).map((site) => `${site.path}:${site.nameLine}`));
    return entries.flatMap((entry) => this.referenceSite(entry, declared)).sort(byPlace);
  }

  private referenceSite(entry: ts.ReferenceEntry, declared: Set<string>): ReferenceSite[] {
    const sourceFile = this.service.getProgram()?.getSourceFile(entry.fileName);
    if (!sourceFile) return [];
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(entry.textSpan.start);
    const place = this.locate(entry.fileName);
    return [
      {
        ...place,
        line: line + 1,
        column: character,
        text: lineText(sourceFile, line),
        definition: declared.has(`${place.path}:${line + 1}`),
      },
    ];
  }
}

const FORCED_OPTIONS: ts.CompilerOptions = {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  allowJs: true,
  checkJs: false,
  noEmit: true,
  skipLibCheck: true,
  types: [],
  lib: LIB_NAMES,
  jsx: ts.JsxEmit.Preserve,
};

function relativeExtends(text: string, path: string): string | null {
  const config: unknown = ts.parseConfigFileTextToJson(path, text).config;
  const extended = (config as { extends?: unknown } | undefined)?.extends;
  if (typeof extended !== 'string' || !extended.startsWith('.')) return null;
  return joinPath(dirOf(path), extended.endsWith('.json') ? extended : `${extended}.json`);
}

function textHash(text: string): string {
  let hash = 2166136261;
  for (let at = 0; at < text.length; at += 1) hash = Math.imul(hash ^ text.charCodeAt(at), 16777619);
  return `${text.length}:${hash >>> 0}`;
}

function snapshotOf(text: string | undefined): ts.IScriptSnapshot | undefined {
  return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
}

function offsetOf(sourceFile: ts.SourceFile, line: number, column: number): number | null {
  const starts = sourceFile.getLineStarts();
  const start = starts[line - 1];
  if (start === undefined) return null;
  const end = starts[line] ?? sourceFile.text.length;
  return Math.min(start + column, end);
}

function lineOf(sourceFile: ts.SourceFile, position: number): number {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function lineText(sourceFile: ts.SourceFile, line: number): string {
  const starts = sourceFile.getLineStarts();
  const text = sourceFile.text.slice(starts[line], starts[line + 1] ?? sourceFile.text.length);
  return text.trim().slice(0, TEXT_MAX);
}

function byPlace(a: ReferenceSite, b: ReferenceSite): number {
  return a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column;
}

function uniqueSites(sites: DefinitionSite[]): DefinitionSite[] {
  const seen = new Set<string>();
  return sites.filter((site) => {
    const key = `${site.ref}\0${site.path}\0${site.nameLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function directoriesOf(listing: Set<string>): Set<string> {
  const found = new Set<string>();
  for (const path of listing) {
    const parts = path.split('/');
    for (let depth = 1; depth < parts.length; depth += 1) found.add(parts.slice(0, depth).join('/'));
  }
  return found;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

