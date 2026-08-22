import { languageOf } from './languageOf';
import { countLines, fileNameOf, locationAt, scanned } from './lineScan';
import type { CodebaseFile, InventoryEntry } from '@/features/codebases/codebaseSource';
import type { LanguageShare, MapNode, MapSymbol } from './insightTypes';

const MAX_DEPTH = 4;
const MAX_CHILDREN = 40;
const MAX_SYMBOLS = 10;
const MAX_LANGUAGES_SHOWN = 4;
const GLOSS_LIMIT = 200;

interface SymbolPattern {
  kind: string;
  pattern: RegExp;
}

const SYMBOL_PATTERNS: [RegExp, SymbolPattern[]][] = [
  [/\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/, [
    { kind: 'fn', pattern: /^export\s+(?:default\s+)?(?:async\s+)?function\s+([\w$]+)/ },
    { kind: 'class', pattern: /^export\s+(?:default\s+)?(?:abstract\s+)?class\s+([\w$]+)/ },
    { kind: 'const', pattern: /^export\s+const\s+([\w$]+)/ },
    { kind: 'type', pattern: /^export\s+(?:interface|type|enum)\s+([\w$]+)/ },
  ]],
  [/\.py$/, [
    { kind: 'fn', pattern: /^(?:async\s+)?def\s+(\w+)/ },
    { kind: 'class', pattern: /^class\s+(\w+)/ },
  ]],
  [/\.go$/, [
    { kind: 'fn', pattern: /^func\s+(?:\([^)]*\)\s+)?([A-Z]\w*)/ },
    { kind: 'type', pattern: /^type\s+([A-Z]\w*)/ },
  ]],
  [/\.rs$/, [
    { kind: 'fn', pattern: /^pub\s+(?:async\s+)?fn\s+(\w+)/ },
    { kind: 'type', pattern: /^pub\s+(?:struct|enum|trait)\s+(\w+)/ },
    { kind: 'fn', pattern: /^fn\s+(main)\b/ },
  ]],
  [/\.rb$/, [
    { kind: 'class', pattern: /^\s*class\s+([A-Z][\w:]*)/ },
    { kind: 'module', pattern: /^\s*module\s+([A-Z][\w:]*)/ },
    { kind: 'fn', pattern: /^def\s+(\w+[?!]?)/ },
  ]],
  [/\.(?:java|kt|kts|cs|scala)$/, [
    { kind: 'class', pattern: /^(?:public\s+|internal\s+)?(?:final\s+|abstract\s+|sealed\s+|data\s+|static\s+)*(?:class|interface|enum|record|object)\s+(\w+)/ },
  ]],
  [/\.php$/, [
    { kind: 'class', pattern: /^(?:final\s+|abstract\s+)?class\s+(\w+)/ },
    { kind: 'fn', pattern: /^function\s+(\w+)/ },
  ]],
  [/\.(?:ex|exs)$/, [
    { kind: 'module', pattern: /^defmodule\s+([\w.]+)/ },
  ]],
];

export function buildStructureMap(inventory: InventoryEntry[], files: CodebaseFile[]): MapNode {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const root = emptyNode('', '');
  for (const entry of inventory) {
    insert(root, entry, byPath.get(entry.path));
  }
  finalize(root);
  return root;
}

interface Accumulating extends MapNode {
  languageTallies: Map<string, { files: number; lines: number }>;
  childIndex: Map<string, Accumulating>;
}

function emptyNode(name: string, path: string): Accumulating {
  return {
    name,
    path,
    files: 0,
    codeLines: 0,
    languages: [],
    symbols: [],
    gloss: null,
    children: [],
    languageTallies: new Map(),
    childIndex: new Map(),
  };
}

function insert(root: Accumulating, entry: InventoryEntry, content: CodebaseFile | undefined): void {
  const segments = entry.path.split('/');
  const language = languageOf(entry.path);
  const lines = content && language ? countLines(content.source) : 0;
  let node = root;
  for (let depth = 0; depth <= segments.length - 1; depth += 1) {
    tally(node, language, lines);
    if (depth === segments.length - 1) break;
    if (depth >= MAX_DEPTH) break;
    const segment = segments[depth]!;
    let child = node.childIndex.get(segment);
    if (!child) {
      child = emptyNode(segment, segments.slice(0, depth + 1).join('/'));
      node.childIndex.set(segment, child);
    }
    node = child;
  }
  if (!content) return;
  const holder = directoryNodeOf(root, segments);
  if (holder === null) return;
  if (fileNameOf(entry.path).toLowerCase() === 'readme.md') holder.gloss ??= glossFrom(content.source);
  else if (holder.symbols.length < MAX_SYMBOLS) holder.symbols.push(...symbolsIn(content, MAX_SYMBOLS - holder.symbols.length));
}

function directoryNodeOf(root: Accumulating, segments: string[]): Accumulating | null {
  let node = root;
  for (let depth = 0; depth < segments.length - 1; depth += 1) {
    if (depth >= MAX_DEPTH) return null;
    const child = node.childIndex.get(segments[depth]!);
    if (!child) return null;
    node = child;
  }
  return node;
}

function tally(node: Accumulating, language: string | null, lines: number): void {
  node.files += 1;
  node.codeLines += lines;
  if (!language) return;
  const held = node.languageTallies.get(language) ?? { files: 0, lines: 0 };
  held.files += 1;
  held.lines += lines;
  node.languageTallies.set(language, held);
}

function finalize(node: Accumulating): void {
  node.languages = languageShares(node.languageTallies);
  node.children = [...node.childIndex.values()]
    .sort((left, right) => right.codeLines - left.codeLines || right.files - left.files)
    .slice(0, MAX_CHILDREN);
  for (const child of node.children as Accumulating[]) finalize(child);
  cleanup(node);
}

function cleanup(node: Accumulating): void {
  delete (node as Partial<Accumulating>).languageTallies;
  delete (node as Partial<Accumulating>).childIndex;
}

export function languageShares(tallies: Map<string, { files: number; lines: number }>): LanguageShare[] {
  return [...tallies]
    .map(([language, held]) => ({ language, files: held.files, lines: held.lines }))
    .sort((left, right) => right.lines - left.lines || right.files - left.files)
    .slice(0, MAX_LANGUAGES_SHOWN);
}

export function overallLanguages(inventory: InventoryEntry[], files: CodebaseFile[]): LanguageShare[] {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const tallies = new Map<string, { files: number; lines: number }>();
  for (const entry of inventory) {
    const language = languageOf(entry.path);
    if (!language) continue;
    const held = tallies.get(language) ?? { files: 0, lines: 0 };
    held.files += 1;
    const content = byPath.get(entry.path);
    if (content) held.lines += countLines(content.source);
    tallies.set(language, held);
  }
  return [...tallies]
    .map(([language, held]) => ({ language, files: held.files, lines: held.lines }))
    .sort((left, right) => right.lines - left.lines)
    .slice(0, 8);
}

function glossFrom(readme: string): string | null {
  for (const raw of readme.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith('<') || line.startsWith('[!') || line.startsWith('!')) continue;
    const plain = line.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '');
    if (plain.length < 8) continue;
    return plain.length > GLOSS_LIMIT ? `${plain.slice(0, GLOSS_LIMIT)}…` : plain;
  }
  return null;
}

function symbolsIn(content: CodebaseFile, budget: number): MapSymbol[] {
  const patterns = SYMBOL_PATTERNS.find(([matcher]) => matcher.test(content.path))?.[1];
  if (!patterns || budget <= 0) return [];
  const file = scanned(content);
  const found: MapSymbol[] = [];
  for (let at = 0; at < file.lines.length && found.length < budget; at += 1) {
    for (const { kind, pattern } of patterns) {
      const match = file.lines[at]!.match(pattern);
      if (match) {
        found.push({ kind, name: match[1]!, at: locationAt(file, at) });
        break;
      }
    }
  }
  return found;
}
