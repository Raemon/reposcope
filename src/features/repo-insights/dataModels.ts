import { isTestPath } from './languageOf';
import { locationAt, scanned, type ScannedFile } from './lineScan';
import type { CodebaseFile } from '@/features/codebases/codebaseSource';
import type { DataModel, ModelField } from './insightTypes';

const MAX_MODELS = 100;
const MAX_FIELDS = 24;
const BLOCK_LIMIT = 120;

const SQL_CONSTRAINT_KEYWORDS = /^(?:PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|KEY|INDEX|CHECK|CREATE|ALTER|DROP|REFERENCES|ON|IF)\b/i;

export function discoverDataModels(files: CodebaseFile[]): DataModel[] {
  const models: DataModel[] = [];
  for (const source of files) {
    if (isTestPath(source.path)) continue;
    if (models.length >= MAX_MODELS) break;
    if (source.path.endsWith('.prisma')) prismaModels(scanned(source), models);
    else if (source.path.endsWith('.sql')) sqlTables(scanned(source), models);
    else if (source.path.endsWith('.py')) pythonModels(scanned(source), models);
    else if (source.path.endsWith('.rb')) railsTables(scanned(source), models);
    else if (source.path.endsWith('.go')) goTaggedStructs(scanned(source), models);
    else if (/\.(?:ts|js|mts|mjs)$/.test(source.path)) jsSchemas(scanned(source), models);
  }
  return dedupe(models).slice(0, MAX_MODELS);
}

function dedupe(models: DataModel[]): DataModel[] {
  const seen = new Map<string, DataModel>();
  for (const model of models) {
    const key = `${model.kind} ${model.name}`;
    const held = seen.get(key);
    if (!held || model.fields.length > held.fields.length) seen.set(key, model);
  }
  return [...seen.values()].map((model) => ({ ...model, fields: uniqueFields(model.fields) }));
}

function uniqueFields(fields: ModelField[]): ModelField[] {
  const seen = new Map<string, ModelField>();
  for (const field of fields) {
    if (!seen.has(field.name)) seen.set(field.name, field);
  }
  return [...seen.values()];
}

function prismaModels(file: ScannedFile, models: DataModel[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/^model\s+(\w+)\s*\{/);
    if (!match) return;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      if (row.trim().startsWith('}')) break;
      const field = row.match(/^\s*(\w+)\s+(\S+)/);
      if (field && !field[1]!.startsWith('@') && fields.length < MAX_FIELDS) {
        fields.push({ name: field[1]!, type: field[2] ?? '' });
      }
    }
    models.push({ name: match[1]!, kind: 'prisma', fields, at: locationAt(file, at) });
  });
}

function sqlTables(file: ScannedFile, models: DataModel[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([\w.]+)[`"']?/i);
    if (!match) return;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!.trim();
      if (row.startsWith(')') || row === ');') break;
      const column = row.match(/^[`"']?(\w+)[`"']?\s+([A-Za-z]\w*(?:\([^)]*\))?)/);
      if (column && !SQL_CONSTRAINT_KEYWORDS.test(column[1]!) && fields.length < MAX_FIELDS) {
        fields.push({ name: column[1]!, type: column[2]!.toLowerCase() });
      }
    }
    models.push({ name: match[1]!, kind: 'sql', fields, at: locationAt(file, at) });
  });
}

function pythonModels(file: ScannedFile, models: DataModel[]): void {
  file.lines.forEach((line, at) => {
    const django = line.match(/^class\s+(\w+)\((?:[\w.]*\s*,\s*)*[\w.]*models\.Model[\w.,\s]*\):/);
    const sqlalchemy = line.match(/^class\s+(\w+)\((?:[\w.,\s]*\b(?:Base|db\.Model|DeclarativeBase)\b[\w.,\s]*)\):/);
    const sqlmodel = /table\s*=\s*True/.test(line) ? line.match(/^class\s+(\w+)\(/) : null;
    const matched = django ?? sqlmodel ?? sqlalchemy;
    if (!matched) return;
    const kind = django ? 'django' : sqlmodel ? 'sqlmodel' : 'sqlalchemy';
    const fields: ModelField[] = [];
    let bodyIndent: number | null = null;
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      if (row.trim() === '') continue;
      const indent = row.match(/^\s*/)![0].length;
      if (indent === 0) break;
      bodyIndent ??= indent;
      if (indent !== bodyIndent) continue;
      if (/^\s*(?:async\s+)?def\s|^\s*@/.test(row)) break;
      const assigned = row.match(/^\s+(\w+)\s*=\s*(?:models|db|sa|sqlalchemy)?\.?(?:Column\(\s*)?(?:models\.|db\.|sa\.)?(\w+)/);
      const annotated = row.match(/^\s+(\w+)\s*:\s*(?:Mapped\[)?([\w[\]|.\s]+?)(?:\]|\s*=|$)/);
      const field = kind === 'django' || (assigned && /Column|models\./.test(row)) ? assigned : annotated ?? assigned;
      if (field && !field[1]!.startsWith('_') && fields.length < MAX_FIELDS) {
        fields.push({ name: field[1]!, type: (field[2] ?? '').trim() });
      }
    }
    models.push({ name: matched[1]!, kind, fields, at: locationAt(file, at) });
  });
}

function railsTables(file: ScannedFile, models: DataModel[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(/create_table\s+['":](\w+)/);
    if (!match) return;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!.trim();
      if (row === 'end') break;
      const column = row.match(/^t\.(\w+)\s+:(\w+)/);
      if (column && column[1] !== 'index' && fields.length < MAX_FIELDS) {
        fields.push({ name: column[2]!, type: column[1]! });
      }
    }
    models.push({ name: match[1]!, kind: 'activerecord', fields, at: locationAt(file, at) });
  });
}

function goTaggedStructs(file: ScannedFile, models: DataModel[]): void {
  if (!file.source.includes('gorm:') && !file.source.includes('db:"')) return;
  file.lines.forEach((line, at) => {
    const match = line.match(/^type\s+(\w+)\s+struct\s*\{/);
    if (!match) return;
    const fields: ModelField[] = [];
    let tagged = false;
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!;
      if (/^\}/.test(row)) break;
      if (row.includes('gorm:') || row.includes('db:"')) tagged = true;
      const field = row.match(/^\s+(\w+)\s+([\w[\]*.]+)/);
      if (field && fields.length < MAX_FIELDS) fields.push({ name: field[1]!, type: field[2]! });
    }
    if (tagged) models.push({ name: match[1]!, kind: 'gorm', fields, at: locationAt(file, at) });
  });
}

function jsSchemas(file: ScannedFile, models: DataModel[]): void {
  file.lines.forEach((line, at) => {
    const mongoose = line.match(/mongoose\.model(?:<[^>]*>)?\(\s*['"](\w+)['"]/);
    if (mongoose) models.push({ name: mongoose[1]!, kind: 'mongoose', fields: [], at: locationAt(file, at) });
    const drizzle = line.match(/(?:pgTable|mysqlTable|sqliteTable)\(\s*['"](\w+)['"]/);
    if (!drizzle) return;
    const fields: ModelField[] = [];
    for (let scan = at + 1; scan < Math.min(at + BLOCK_LIMIT, file.lines.length); scan += 1) {
      const row = file.lines[scan]!.trim();
      if (row.startsWith('}')) break;
      const column = row.match(/^(\w+)\s*:\s*(\w+)\(/);
      if (column && fields.length < MAX_FIELDS) fields.push({ name: column[1]!, type: column[2]! });
    }
    models.push({ name: drizzle[1]!, kind: 'drizzle', fields, at: locationAt(file, at) });
  });
}
