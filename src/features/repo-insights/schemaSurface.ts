import { isTestPath, languageOf } from './languageOf';
import { fileNameOf, locationAt, scanned, type ScannedFile } from './lineScan';
import type { CodebaseFile } from '@/features/codebases/codebaseSource';
import type { SourceLocation } from '@/features/surface-ui/sourceLocation';
import type { ModelField, SchemaFileGroup, SchemaModel, SchemaSurface } from './insightTypes';

const DISCOVERY_LIMIT = 500;
const MAX_MODELS = 100;
const MAX_FIELDS = 24;
const MAX_GROUPS = 40;
const MAX_SITES = 4;
const BLOCK_LIMIT = 160;
const EXCERPT_LIMIT = 180;

// Priorities decide which definition wins when the same table is declared in
// several places: a canonical schema (Prisma, ORM entity) beats a bare model
// class, which beats a GraphQL type, which beats a migration's CREATE TABLE.
const CANONICAL = 5;
const ORM = 4;
const MODEL_CLASS = 3;
const API_TYPE = 2;
const MIGRATION = 1;

interface FoundModel {
  name: string;
  table: string | null;
  varName: string | null;
  kind: string;
  fields: ModelField[];
  at: SourceLocation;
  priority: number;
  storedIn?: string;
}

interface SchemaFileHit {
  path: string;
  kind: string;
  signal: string;
  migration: boolean;
  models: number;
}

export function buildSchemaSurface(files: CodebaseFile[]): SchemaSurface {
  const found: FoundModel[] = [];
  const hits: SchemaFileHit[] = [];
  for (const source of files) {
    if (isTestPath(source.path) || isGeneratedPath(source.path)) continue;
    if (found.length >= DISCOVERY_LIMIT) break;
    inspectFile(source, found, hits);
  }
  const tables = dedupe(found);
  const documents = storedDocumentModels(files, tables, hits);
  const models = countCallsites(documents.length > 0 ? dedupe([...tables, ...documents]) : tables, files)
    .sort(
      (left, right) =>
        right.callsites - left.callsites ||
        right.fields.length - left.fields.length ||
        left.name.localeCompare(right.name),
    )
    .slice(0, MAX_MODELS);
  return { files: fileGroups(hits), models };
}

// ---------------------------------------------------------------------------
// Schema file identification. A file counts as schema when a definition
// extractor actually finds tables/models/types in it — filenames alone lie
// ("schema.ts" is usually a zod validator, "modules/migration/" may be
// GitHub-import logic). Migration files are identified by directory plus a
// content check, and recorded even when they only alter existing tables.
// ---------------------------------------------------------------------------

function inspectFile(source: CodebaseFile, found: FoundModel[], hits: SchemaFileHit[]): void {
  const path = source.path;
  const migration = isMigrationPath(path);
  const before = found.length;
  const record = (kind: string, signal: string) =>
    hits.push({ path, kind, signal, migration, models: found.length - before });

  if (path.endsWith('.prisma')) {
    prismaModels(scanned(source), found);
    if (found.length > before) record('prisma', 'Prisma schema: model blocks');
  } else if (path.endsWith('.sql')) {
    sqlTables(scanned(source), found, migration ? MIGRATION : ORM);
    if (found.length > before) record('sql', migration ? 'SQL migration: CREATE TABLE' : 'SQL DDL: CREATE TABLE');
    else if (migration && /\b(?:ALTER|CREATE|DROP)\b/i.test(source.source)) record('sql', 'SQL migration');
  } else if (path.endsWith('.graphql') || path.endsWith('.gql')) {
    graphqlTypes(scanned(source), found);
    if (found.length > before) record('graphql', 'GraphQL SDL: object types');
  } else if (path.endsWith('.py')) {
    if (migration) {
      if (/^class Migration\b/m.test(source.source)) record('django', 'Django migration');
      return;
    }
    pythonModels(scanned(source), found);
    if (found.length > before) record(found[before]!.kind, 'ORM model classes');
  } else if (path.endsWith('.rb')) {
    railsTables(scanned(source), found, migration ? MIGRATION : ORM);
    if (!migration) activeRecordClasses(scanned(source), found);
    if (found.length > before) {
      const dump = fileNameOf(path) === 'schema.rb';
      record('activerecord', migration ? 'ActiveRecord migration: create_table' : dump ? 'Rails schema dump: create_table' : 'ActiveRecord model classes');
    } else if (migration && source.source.includes('ActiveRecord::Migration')) {
      record('activerecord', 'ActiveRecord migration');
    }
  } else if (path.endsWith('.go')) {
    if (migration) return;
    goTaggedStructs(scanned(source), found);
    if (found.length > before) record(found[before]!.kind, 'Go structs with ORM column tags');
  } else if (/\.(?:ts|js|mts|mjs)$/.test(path)) {
    if (migration) {
      sequelizeMigrationTables(scanned(source), found);
      if (found.length > before) record('sequelize', 'Sequelize migration: createTable');
      else if (source.source.includes('queryInterface')) record('sequelize', 'Sequelize migration');
      return;
    }
    jsSchemas(scanned(source), found);
    if (found.length > before) record(found[before]!.kind, JS_SIGNALS[found[before]!.kind] ?? 'schema definitions');
  }
}

const JS_SIGNALS: Record<string, string> = {
  drizzle: 'drizzle: pgTable/mysqlTable/sqliteTable',
  typeorm: 'TypeORM: @Entity classes',
  sequelize: 'Sequelize: @Table models',
  mongoose: 'mongoose: models and Schemas',
};

function isMigrationPath(path: string): boolean {
  return /(?:^|\/)(?:migrations|migrate)\//.test(path);
}

function isGeneratedPath(path: string): boolean {
  return /(?:^|\/)(?:__generated__|generated)\//.test(path);
}

function isPureSchemaFile(path: string): boolean {
  return /\.(?:prisma|sql|graphql|gql)$/.test(path) || fileNameOf(path) === 'schema.rb';
}

function fileGroups(hits: SchemaFileHit[]): SchemaFileGroup[] {
  const groups = new Map<string, SchemaFileGroup>();
  for (const hit of hits) {
    const root = hit.migration ? migrationRoot(hit.path) : dirOf(hit.path);
    const key = `${root} ${hit.kind} ${hit.migration}`;
    const held = groups.get(key);
    if (held) {
      held.files += 1;
      held.models += hit.models;
      held.label = `${root}/`;
    } else {
      groups.set(key, { label: hit.path, kind: hit.kind, signal: hit.signal, files: 1, models: hit.models });
    }
  }
  return [...groups.values()]
    .sort((left, right) => right.models - left.models || right.files - left.files || left.label.localeCompare(right.label))
    .slice(0, MAX_GROUPS);
}

function migrationRoot(path: string): string {
  const match = path.match(/^(.*?(?:^|\/)(?:migrations|migrate))\//);
  return match ? match[1]! : dirOf(path);
}

function dirOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut < 0 ? path : path.slice(0, cut);
}

// ---------------------------------------------------------------------------
// Callsites. Each model is referenced by a few spellings: its declared name
// as a bare identifier (`User`, `ApiKeyEntity`), and its table name inside
// string quotes (`"users"`, `'EventType'` in raw SQL or association calls).
// Bare lowercase words are only counted for drizzle-style exported table
// variables — otherwise `user` would match every local variable. Definitions
// don't count: tests, migrations, pure schema files, and each model's own
// declaration file are skipped.
// ---------------------------------------------------------------------------

const GENERIC_NAMES = new Set(['Model', 'Base', 'Entity', 'Schema', 'Migration', 'Application', 'Record', 'Table', 'Map', 'List', 'State', 'Data']);

const TOKEN = /[A-Za-z_][A-Za-z0-9_]*/g;
const QUOTES = "'\"`";

function countCallsites(models: FoundModel[], files: CodebaseFile[]): SchemaModel[] {
  const counted: SchemaModel[] = models.map((model) => ({
    name: model.name,
    kind: model.kind,
    fields: model.fields,
    at: model.at,
    storedIn: model.storedIn ?? null,
    callsites: 0,
    callsiteFiles: 0,
    sites: [],
  }));
  const declaredNames = new Set(models.map((model) => model.name));
  const declaredTables = new Set(models.map((model) => snakePlural(model.name)));
  const bare = variantMap(models, (model) =>
    identifierVariants(model).filter(
      (variant) => variant === model.name || variant === model.varName || !declaredNames.has(variant),
    ),
  );
  const quoted = variantMap(models, (model) =>
    quotedVariants(model).filter(
      (variant) => variant === model.name || variant === snakePlural(model.name) || !declaredTables.has(variant),
    ),
  );
  for (const file of files) {
    if (isTestPath(file.path) || isMigrationPath(file.path) || isPureSchemaFile(file.path)) continue;
    if (languageOf(file.path) === null) continue;
    tallyFile(file, counted, bare, quoted);
  }
  return counted;
}

function tallyFile(
  file: CodebaseFile,
  counted: SchemaModel[],
  bare: Map<string, number[]>,
  quoted: Map<string, number[]>,
): void {
  const seenHere = new Set<number>();
  file.source.split(/\r?\n/).forEach((line, lineIndex) => {
    TOKEN.lastIndex = 0;
    let match;
    while ((match = TOKEN.exec(line)) !== null) {
      const bareHits = isCallSyntax(line, match) ? undefined : bare.get(match[0]);
      const quotedHits =
        match.index > 0 && QUOTES.includes(line[match.index - 1]!) ? quoted.get(match[0]) : undefined;
      if (!bareHits && !quotedHits) continue;
      for (const modelAt of new Set([...(bareHits ?? []), ...(quotedHits ?? [])])) {
        const held = counted[modelAt]!;
        if (held.at.file === file.path) continue;
        held.callsites += 1;
        if (seenHere.has(modelAt)) continue;
        seenHere.add(modelAt);
        held.callsiteFiles += 1;
        if (held.sites.length < MAX_SITES) held.sites.push(siteAt(file.path, line, lineIndex));
      }
    }
  });
}

function isCallSyntax(line: string, match: RegExpExecArray): boolean {
  if (!/^\s*\(/.test(line.slice(match.index + match[0].length))) return false;
  return !/(?:^|[^\w.])new\s+$/.test(line.slice(0, match.index));
}

function siteAt(path: string, line: string, lineIndex: number): SourceLocation {
  const excerpt = line.trim();
  return {
    file: path,
    line: lineIndex + 1,
    excerpt: excerpt.length > EXCERPT_LIMIT ? `${excerpt.slice(0, EXCERPT_LIMIT)}…` : excerpt,
  };
}

function variantMap(models: FoundModel[], variantsOf: (model: FoundModel) => string[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  models.forEach((model, at) => {
    for (const variant of variantsOf(model)) {
      const held = map.get(variant);
      if (held) held.push(at);
      else map.set(variant, [at]);
    }
  });
  return map;
}

function identifierVariants(model: FoundModel): string[] {
  const variants = new Set<string>();
  const add = (name: string) => {
    if (name.length >= 3 && /[A-Z]/.test(name) && !GENERIC_NAMES.has(name)) variants.add(name);
  };
  add(model.name);
  if (model.kind === 'document') return [...variants];
  add(model.name.replace(/(?:Entity|Model|Schema)$/, ''));
  add(pascalSingular(model.name));
  if (model.table) add(pascalSingular(model.table));
  if (model.varName && model.varName.length >= 3 && !GENERIC_NAMES.has(model.varName)) variants.add(model.varName);
  return [...variants];
}

function quotedVariants(model: FoundModel): string[] {
  const variants = new Set<string>();
  const add = (name: string) => {
    if (name.length >= 3) variants.add(name);
  };
  add(model.name);
  add(snakePlural(model.name));
  if (model.table) {
    add(model.table);
    add(snakePlural(model.table));
  }
  return [...variants];
}

function pascalSingular(name: string): string {
  const words = name.split(/[_\-\s.]+/).filter(Boolean);
  if (words.length === 0) return name;
  words[words.length - 1] = singularWord(words[words.length - 1]!);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function singularWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(?:ses|xes|zes|ches|shes)$/.test(lower)) return word.slice(0, -2);
  if (lower.endsWith('ss') || !lower.endsWith('s')) return word;
  return word.slice(0, -1);
}

function snakePlural(name: string): string {
  const snake = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
  const words = snake.split('_');
  words[words.length - 1] = pluralWord(words[words.length - 1]!);
  return words.join('_');
}

function pluralWord(word: string): string {
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(?:s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

// ---------------------------------------------------------------------------
// Deduplication. The same table often appears as a canonical model, a GraphQL
// type, and a dozen migrations; names are normalized (case, underscores,
// plurals) so `User`, `users`, and `user` collapse into one entry. The
// highest-priority definition wins; a fieldless winner (a Rails model class)
// borrows fields from a lower one (its create_table migration).
// ---------------------------------------------------------------------------

function dedupe(models: FoundModel[]): FoundModel[] {
  const seen = new Map<string, FoundModel>();
  for (const model of models) {
    const key = normalizedName(model.name);
    const held = seen.get(key);
    if (!held) {
      seen.set(key, { ...model });
      continue;
    }
    const modelWins =
      model.priority > held.priority || (model.priority === held.priority && model.fields.length > held.fields.length);
    const winner = modelWins ? model : held;
    const loser = modelWins ? held : model;
    seen.set(key, {
      ...winner,
      table: winner.table ?? loser.table,
      varName: winner.varName ?? loser.varName,
      storedIn: winner.storedIn ?? loser.storedIn,
      fields: winner.fields.length > 0 ? winner.fields : loser.fields,
    });
  }
  return [...seen.values()].map((model) => ({ ...model, fields: uniqueFields(model.fields).slice(0, MAX_FIELDS) }));
}

function normalizedName(name: string): string {
  return singularWord(name.toLowerCase().replace(/[_\s.-]/g, ''));
}

function uniqueFields(fields: ModelField[]): ModelField[] {
  const seen = new Map<string, ModelField>();
  for (const field of fields) {
    if (!seen.has(field.name)) seen.set(field.name, field);
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Extractors, one per definition style.
// ---------------------------------------------------------------------------

function prismaModels(file: ScannedFile, found: FoundModel[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/^model\s+(\w+)\s*\{/);
    if (!match) return;
    const fields: ModelField[] = [];
    let table: string | null = null;
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      if (row.trim().startsWith('}')) break;
      const mapped = row.match(/@@map\(\s*["'](\w+)["']/);
      if (mapped) table = mapped[1]!;
      const field = row.match(/^\s*(\w+)\s+(\S+)/);
      if (field && !field[1]!.startsWith('@') && fields.length < MAX_FIELDS) {
        fields.push({ name: field[1]!, type: field[2] ?? '' });
      }
    }
    found.push({ name: match[1]!, table, varName: null, kind: 'prisma', fields, at: locationAt(file, at), priority: CANONICAL });
  });
}

const SQL_CONSTRAINT_KEYWORDS = /^(?:PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|KEY|INDEX|CHECK|CREATE|ALTER|DROP|REFERENCES|ON|IF)\b/i;

function sqlTables(file: ScannedFile, found: FoundModel[], priority: number): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"']?\w+[`"']?\s*\.\s*)*[`"']?(\w+)[`"']?/i);
    if (!match) return;
    const name = match[1]!;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!.trim();
      if (row.startsWith(')') || row === ');') break;
      const column = row.match(/^[`"']?(\w+)[`"']?\s+([A-Za-z]\w*(?:\([^)]*\))?)/);
      if (column && !SQL_CONSTRAINT_KEYWORDS.test(column[1]!) && fields.length < MAX_FIELDS) {
        fields.push({ name: column[1]!, type: column[2]!.toLowerCase() });
      }
    }
    found.push({ name, table: name, varName: null, kind: 'sql', fields, at: locationAt(file, at), priority });
  });
}

const SDL_ROOT_TYPES = new Set(['Query', 'Mutation', 'Subscription']);

function graphqlTypes(file: ScannedFile, found: FoundModel[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/^(?:type|interface)\s+([A-Z]\w*)(?:\s+implements\s+[\w\s&,]+)?\s*\{/);
    if (!match || SDL_ROOT_TYPES.has(match[1]!)) return;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      if (row.trim().startsWith('}')) break;
      const field = row.match(/^\s+(\w+)\s*(?:\([^)]*\))?\s*:\s*([[\]\w!]+)/);
      if (field && fields.length < MAX_FIELDS) fields.push({ name: field[1]!, type: field[2]! });
    }
    found.push({ name: match[1]!, table: null, varName: null, kind: 'graphql', fields, at: locationAt(file, at), priority: API_TYPE });
  });
}

function pythonModels(file: ScannedFile, found: FoundModel[]): void {
  file.lines.forEach((line, at) => {
    const django = line.match(/^class\s+(\w+)\((?:[\w.]*\s*,\s*)*[\w.]*models\.Model[\w.,\s]*\):/);
    const sqlalchemy = line.match(/^class\s+(\w+)\((?:[\w.,\s]*\b(?:Base|db\.Model|DeclarativeBase)\b[\w.,\s]*)\):/);
    const sqlmodel = /table\s*=\s*True/.test(line) ? line.match(/^class\s+(\w+)\(/) : null;
    const bases = line.match(/^class\s+(\w+)\(\s*\w[\w.,\s]*\):/);
    const matched = django ?? sqlmodel ?? sqlalchemy ?? bases;
    if (!matched) return;
    const inferred = !django && !sqlmodel && !sqlalchemy;
    const kind = django || inferred ? 'django' : sqlmodel ? 'sqlmodel' : 'sqlalchemy';
    const fields: ModelField[] = [];
    let table: string | null = null;
    let bodyIndent: number | null = null;
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      if (row.trim() === '') continue;
      const tableName = row.match(/__tablename__\s*=\s*["'](\w+)["']/);
      if (tableName) table = tableName[1]!;
      const indent = row.match(/^\s*/)![0].length;
      if (indent === 0) break;
      bodyIndent ??= indent;
      if (indent !== bodyIndent) continue;
      if (/^\s*(?:async\s+)?def\s|^\s*@/.test(row)) break;
      const assigned = row.match(/^\s+(\w+)\s*=\s*(?:models|db|sa|sqlalchemy)?\.?(?:Column\(\s*)?(?:models\.|db\.|sa\.)?(\w+)/);
      const annotated = row.match(/^\s+(\w+)\s*:\s*(?:Mapped\[)?([\w[\]|.\s]+?)(?:\]|\s*=|$)/);
      const columnLike = assigned !== null && /Column\(|models\.|db\.|sa\./.test(row);
      if (inferred && !columnLike) continue;
      const field = kind === 'django' || columnLike ? assigned : annotated ?? assigned;
      if (field && !field[1]!.startsWith('_') && fields.length < MAX_FIELDS) {
        fields.push({ name: field[1]!, type: (field[2] ?? '').trim() });
      }
    }
    if (inferred && fields.length === 0) return;
    found.push({ name: matched[1]!, table, varName: null, kind, fields, at: locationAt(file, at), priority: ORM });
  });
}

function railsTables(file: ScannedFile, found: FoundModel[], priority: number): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/create_table\s+['":](\w+)/);
    if (!match) return;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!.trim();
      if (row === 'end') break;
      const column = row.match(/^t\.(\w+)\s+[:'"](\w+)/);
      if (column && column[1] !== 'index' && fields.length < MAX_FIELDS) {
        fields.push({ name: column[2]!, type: column[1]! });
      }
    }
    found.push({ name: match[1]!, table: match[1]!, varName: null, kind: 'activerecord', fields, at: locationAt(file, at), priority });
  });
}

function activeRecordClasses(file: ScannedFile, found: FoundModel[]): void {
  if (!file.source.includes('ApplicationRecord') && !file.source.includes('ActiveRecord::Base')) return;
  file.lines.forEach((line, at) => {
    const match = line.match(/^class\s+(\w+)\s*<\s*(?:ApplicationRecord|ActiveRecord::Base)\b/);
    if (!match) return;
    found.push({
      name: match[1]!,
      table: snakePlural(match[1]!),
      varName: null,
      kind: 'activerecord',
      fields: [],
      at: locationAt(file, at),
      priority: MODEL_CLASS,
    });
  });
}

function goTaggedStructs(file: ScannedFile, found: FoundModel[]): void {
  if (!file.source.includes('gorm:') && !file.source.includes('xorm:') && !file.source.includes('db:"')) return;
  file.lines.forEach((line, at) => {
    const match = line.match(/^type\s+(\w+)\s+struct\s*\{/);
    if (!match) return;
    const fields: ModelField[] = [];
    let kind: string | null = null;
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      if (/^\}/.test(row)) break;
      if (row.includes('xorm:')) kind ??= 'xorm';
      if (row.includes('gorm:') || row.includes('db:"')) kind ??= 'gorm';
      const field = row.match(/^\s+(\w+)\s+([\w[\]*.]+)/);
      if (field && fields.length < MAX_FIELDS) fields.push({ name: field[1]!, type: field[2]! });
    }
    if (kind) {
      found.push({ name: match[1]!, table: snakePlural(match[1]!), varName: null, kind, fields, at: locationAt(file, at), priority: ORM });
    }
  });
}

function jsSchemas(file: ScannedFile, found: FoundModel[]): void {
  drizzleTables(file, found);
  typeormEntities(file, found);
  sequelizeTsModels(file, found);
  sequelizeDefines(file, found);
  mongooseModels(file, found);
}

function drizzleTables(file: ScannedFile, found: FoundModel[]): void {
  if (!/(?:pgTable|mysqlTable|sqliteTable)\(/.test(file.source)) return;
  file.lines.forEach((line, at) => {
    const match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\w+\.)?(?:pgTable|mysqlTable|sqliteTable)\(\s*['"](\w+)['"]/);
    if (!match) return;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!.trim();
      if (row.startsWith('}')) break;
      const column = row.match(/^(\w+)\s*:\s*(\w+)\(/);
      if (column && fields.length < MAX_FIELDS) fields.push({ name: column[1]!, type: column[2]! });
    }
    found.push({ name: match[2]!, table: match[2]!, varName: match[1]!, kind: 'drizzle', fields, at: locationAt(file, at), priority: ORM });
  });
}

function typeormEntities(file: ScannedFile, found: FoundModel[]): void {
  if (!file.source.includes('@Entity')) return;
  file.lines.forEach((line, at) => {
    const entity = line.match(/^\s*@Entity\s*(?:\(\s*(?:['"](\w+)['"]|\{[^)]*?name:\s*['"](\w+)['"])?)?/);
    if (!entity) return;
    for (let scan = at; scan < Math.min(at + 40, file.lines.length); scan += 1) {
      const declared = file.lines[scan]!.match(/class\s+(\w+)/);
      if (!declared) continue;
      found.push({
        name: declared[1]!,
        table: entity[1] ?? entity[2] ?? null,
        varName: null,
        kind: 'typeorm',
        fields: decoratedClassFields(file, scan, /^\s*@\w*Column\b/),
        at: locationAt(file, at),
        priority: ORM,
      });
      return;
    }
  });
}

function sequelizeTsModels(file: ScannedFile, found: FoundModel[]): void {
  if (!file.source.includes('@Table')) return;
  file.lines.forEach((line, at) => {
    if (!/^\s*@Table\s*\(/.test(line)) return;
    let table: string | null = null;
    for (let scan = at; scan < Math.min(at + 40, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      const named = row.match(/tableName:\s*['"](\w+)['"]/);
      if (named) table = named[1]!;
      const declared = row.match(/class\s+(\w+)/);
      if (!declared) continue;
      found.push({
        name: declared[1]!,
        table,
        varName: null,
        kind: 'sequelize',
        fields: decoratedClassFields(file, scan, /^\s*@\w*Column\b/),
        at: locationAt(file, at),
        priority: ORM,
      });
      return;
    }
  });
}

function decoratedClassFields(file: ScannedFile, classLine: number, columnDecorator: RegExp): ModelField[] {
  const fields: ModelField[] = [];
  let pending = false;
  let pendingType = '';
  for (let scan = classLine + 1; scan < Math.min(classLine + BLOCK_LIMIT * 2, file.lines.length); scan += 1) {
    const row = file.lines[scan]!;
    if (/^\}/.test(row)) break;
    if (columnDecorator.test(row)) {
      pending = true;
      pendingType = row.match(/DataType\.(\w+)/)?.[1]?.toLowerCase() ?? '';
      const inline = row.match(/\)\s*(?:declare\s+|readonly\s+|public\s+)*(\w+)[?!]?\s*:\s*([^;={]+)/);
      if (inline && fields.length < MAX_FIELDS) {
        fields.push({ name: inline[1]!, type: pendingType || inline[2]!.trim() });
        pending = false;
      }
      continue;
    }
    if (!pending || /^\s*@/.test(row)) continue;
    const property = row.match(/^\s*(?:declare\s+|readonly\s+|public\s+)*(\w+)[?!]?\s*:\s*([^;={]+)/);
    if (property && fields.length < MAX_FIELDS) {
      fields.push({ name: property[1]!, type: pendingType || property[2]!.trim() });
    }
    pending = false;
  }
  return fields;
}

function sequelizeDefines(file: ScannedFile, found: FoundModel[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/\.define(?:<[^>]*>)?\(\s*['"](\w+)['"]\s*,\s*\{/);
    if (!match) return;
    found.push({
      name: match[1]!,
      table: null,
      varName: null,
      kind: 'sequelize',
      fields: objectLiteralFields(file, at),
      at: locationAt(file, at),
      priority: MODEL_CLASS,
    });
  });
}

function sequelizeMigrationTables(file: ScannedFile, found: FoundModel[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/\.createTable\(\s*['"](\w+)['"]\s*,\s*\{/);
    if (!match) return;
    found.push({
      name: match[1]!,
      table: match[1]!,
      varName: null,
      kind: 'sequelize',
      fields: objectLiteralFields(file, at),
      at: locationAt(file, at),
      priority: MIGRATION,
    });
  });
}

function objectLiteralFields(file: ScannedFile, openLine: number): ModelField[] {
  const fields: ModelField[] = [];
  let bodyIndent: number | null = null;
  for (let scan = openLine + 1; scan < Math.min(openLine + BLOCK_LIMIT, file.lines.length); scan += 1) {
    const row = file.lines[scan]!;
    if (row.trim() === '') continue;
    const indent = row.match(/^\s*/)![0].length;
    if (/^\s*\}/.test(row) && (bodyIndent === null || indent < bodyIndent)) break;
    bodyIndent ??= indent;
    if (indent !== bodyIndent) continue;
    const field = row.match(/^\s*['"]?(\w+)['"]?\s*:\s*(?:\{|(?:DataTypes|Sequelize)\.(\w+)|([A-Z]\w*)|['"]([\w ]+)['"])/);
    if (field && fields.length < MAX_FIELDS) {
      fields.push({ name: field[1]!, type: (field[2] ?? field[3] ?? field[4] ?? '').toLowerCase() });
    }
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Stored JSON documents. When a table with almost no columns carries a JSON
// column (procgen's `Doc { name, json }`), the database has delegated its
// schema to application types. The real models are found by locating a
// document registry: a TypeScript interface or union whose name signals
// storage (Stored*, Persisted*, *DocumentContents, or the store model's own
// name) and whose entries mostly resolve to object types declared in the
// repo. Each entry becomes a `document` model — named by its payload type,
// carrying the payload's fields, counted by references like any table.
// ---------------------------------------------------------------------------

const MAX_DOCUMENTS = 80;
const STORAGE_NAME = /stored|persisted|saved|serialized|document/i;
const UI_CONTAINER = /(?:Props|Options|Config|Args|Params|Context|Handlers|Events|Refs)$/;
const TYPE_WRAPPERS = new Set(['Record', 'Partial', 'Readonly', 'Required', 'Pick', 'Omit', 'Array', 'ReadonlyArray', 'Map', 'Set', 'Promise', 'Maybe', 'NonNullable']);

interface DocumentContainer {
  file: ScannedFile;
  line: number;
  name: string;
  entries: { key: string; ref: string }[];
}

function storedDocumentModels(files: CodebaseFile[], models: FoundModel[], hits: SchemaFileHit[]): FoundModel[] {
  const store = models.find(
    (model) => model.fields.length > 0 && model.fields.length <= 6 && model.fields.some((field) => /json/i.test(field.type)),
  );
  if (!store) return [];
  const storedIn = `${store.name}.${store.fields.find((field) => /json/i.test(field.type))!.name}`;
  const { declarations, containers } = scanTypeDeclarations(files, normalizedName(store.name));
  const documents = new Map<string, FoundModel>();
  const added = new Map<string, number>();
  for (const container of containers) {
    const resolved = container.entries
      .map((entry) => ({ ...entry, payload: payloadTypeOf(entry.ref, declarations) }))
      .filter((entry, at, all) => all.findIndex((held) => held.key === entry.key) === at);
    const payloads = resolved.filter((entry) => entry.payload !== null).length;
    if (payloads < 3 || payloads * 2 < resolved.length) continue;
    let grew = 0;
    for (const entry of resolved) {
      if (documents.size >= MAX_DOCUMENTS) break;
      const declared = entry.payload ? declarations.get(entry.payload)! : null;
      const model: FoundModel = {
        name: entry.payload ?? entry.key,
        table: entry.payload === null || entry.payload === entry.key ? null : entry.key,
        varName: null,
        kind: 'document',
        fields: declared ? typeScriptFields(declared.file, declared.line) : [],
        at: declared ? locationAt(declared.file, declared.line) : locationAt(container.file, container.line),
        priority: MODEL_CLASS,
        storedIn,
      };
      const key = normalizedName(model.name);
      const held = documents.get(key);
      if (!held) grew += 1;
      if (!held || model.fields.length > held.fields.length) documents.set(key, model);
    }
    if (grew > 0) added.set(container.file.path, (added.get(container.file.path) ?? 0) + grew);
  }
  for (const [path, models_] of added) {
    hits.push({ path, kind: 'document', signal: `JSON document registry — payload types stored in ${storedIn}`, migration: false, models: models_ });
  }
  return [...documents.values()];
}

function scanTypeDeclarations(
  files: CodebaseFile[],
  storeStem: string,
): { declarations: Map<string, { file: ScannedFile; line: number }>; containers: DocumentContainer[] } {
  const declarations = new Map<string, { file: ScannedFile; line: number }>();
  const containers: DocumentContainer[] = [];
  const containerName = (name: string) =>
    !UI_CONTAINER.test(name) && (STORAGE_NAME.test(name) || normalizedName(name) === storeStem);
  for (const source of files) {
    if (!/\.(?:ts|tsx|mts)$/.test(source.path)) continue;
    if (isTestPath(source.path) || isGeneratedPath(source.path) || isMigrationPath(source.path)) continue;
    if (!source.source.includes('interface ') && !source.source.includes('type ')) continue;
    const file = scanned(source);
    file.lines.forEach((line, at) => {
      const decl = line.match(/^(?:export\s+)?(?:declare\s+)?(?:interface\s+([A-Z]\w*)|type\s+([A-Z]\w*)\s*=\s*\{)/);
      const name = decl?.[1] ?? decl?.[2];
      if (name) {
        if (!declarations.has(name)) declarations.set(name, { file, line: at });
        if (containerName(name)) {
          const entries = objectTypeEntries(file, at);
          if (entries.length >= 3) containers.push({ file, line: at, name, entries });
        }
        return;
      }
      const union = line.match(/^(?:export\s+)?type\s+([A-Z]\w*)\s*=\s*(.*)$/);
      if (union && containerName(union[1]!)) {
        const members = unionMembers(file, at, union[2]!);
        if (members.length >= 3) {
          containers.push({ file, line: at, name: union[1]!, entries: members.map((member) => ({ key: member, ref: member })) });
        }
      }
    });
  }
  return { declarations, containers };
}

function objectTypeEntries(file: ScannedFile, openLine: number): { key: string; ref: string }[] {
  const entries: { key: string; ref: string }[] = [];
  let bodyIndent: number | null = null;
  for (let scan = openLine + 1; scan < Math.min(openLine + BLOCK_LIMIT, file.lines.length); scan += 1) {
    const row = file.lines[scan]!;
    if (/^\}/.test(row)) break;
    if (row.trim() === '') continue;
    const indent = row.match(/^\s*/)![0].length;
    bodyIndent ??= indent;
    if (indent !== bodyIndent) continue;
    const entry = row.match(/^\s+(?:readonly\s+)?['"]?(\w+)['"]?\??\s*:\s*([^;]+);?\s*$/);
    if (!entry || entry[2]!.includes('=>') || entry[2]!.trimStart().startsWith('(')) continue;
    entries.push({ key: entry[1]!, ref: entry[2]!.trim() });
  }
  return entries;
}

function unionMembers(file: ScannedFile, openLine: number, rest: string): string[] {
  let joined = rest;
  for (let scan = openLine + 1; scan < Math.min(openLine + 40, file.lines.length); scan += 1) {
    const row = file.lines[scan]!.trim();
    if (!row.startsWith('|')) break;
    joined += ` ${row}`;
  }
  return joined
    .split('|')
    .map((part) => part.trim().replace(/;$/, ''))
    .filter((part) => /^[A-Z]\w*$/.test(part));
}

function payloadTypeOf(ref: string, declarations: Map<string, { file: ScannedFile; line: number }>): string | null {
  const generic = ref.indexOf('<');
  const scopes = generic >= 0 ? [ref.slice(generic + 1), ref] : [ref];
  for (const scope of scopes) {
    for (const token of scope.match(/[A-Z]\w*/g) ?? []) {
      if (TYPE_WRAPPERS.has(token)) continue;
      if (declarations.has(token)) return token;
    }
  }
  return null;
}

function typeScriptFields(file: ScannedFile, line: number): ModelField[] {
  return objectTypeEntries(file, line)
    .slice(0, MAX_FIELDS)
    .map((entry) => ({ name: entry.key, type: entry.ref.length > 30 ? `${entry.ref.slice(0, 30)}…` : entry.ref }));
}

function mongooseModels(file: ScannedFile, found: FoundModel[]): void {
  if (!file.source.includes('mongoose')) return;
  file.lines.forEach((line, at) => {
    const model = line.match(/mongoose\.model(?:<[^>]*>)?\(\s*['"](\w+)['"]/);
    if (model) {
      found.push({ name: model[1]!, table: null, varName: null, kind: 'mongoose', fields: [], at: locationAt(file, at), priority: MODEL_CLASS });
    }
    const schema = line.match(/(?:const|let|var)\s+(\w+?)[Ss]chema\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(\s*\{/);
    if (!schema) return;
    found.push({
      name: pascalSingular(schema[1]!),
      table: null,
      varName: null,
      kind: 'mongoose',
      fields: objectLiteralFields(file, at),
      at: locationAt(file, at),
      priority: MODEL_CLASS,
    });
  });
}
