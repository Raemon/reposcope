import type { ApiTypeEntry } from './apiTypeCatalog';
import type { ApiEndpoint } from './apiEndpointTypes';
import {
  RETURNED_SECTION_ID,
  type ApiTypeReturn,
  type ApiTypeSection,
  type ApiTypeSectionEntry,
} from './apiTypeSectionTypes';

const MUTATING_METHODS = new Set(['POST', 'PUT']);
const SPLIT_ABOVE = 60;
const MERGE_BELOW = 8;

interface Owner {
  name: string;
  depth: number;
}

export function buildApiTypeSections(entries: ApiTypeEntry[], endpoints: ApiEndpoint[]): ApiTypeSection[] {
  const returns = returnsByType(endpoints);
  const returned = entries
    .filter((entry) => returns.has(typeKey(entry)))
    .map((entry) => ({ ...entry, returnedBy: returns.get(typeKey(entry))! }))
    .sort(compareReturned);
  const rest = entries.filter((entry) => !returns.has(typeKey(entry))).map((entry) => ({ ...entry, returnedBy: [] }));
  const sections = [...ownerSections(rest)];
  if (returned.length > 0) {
    sections.unshift({ id: RETURNED_SECTION_ID, title: 'Returned by POST and PUT', entries: returned });
  }
  return sections;
}

function returnsByType(endpoints: ApiEndpoint[]): Map<string, ApiTypeReturn[]> {
  const returns = new Map<string, ApiTypeReturn[]>();
  for (const endpoint of endpoints) {
    if (!MUTATING_METHODS.has(endpoint.method)) continue;
    for (const output of endpoint.signature.outputs) {
      for (const type of output.types) {
        const key = `${type.file}:${type.name}`;
        const held = returns.get(key) ?? [];
        held.push({ method: endpoint.method, path: endpoint.path, status: output.status, through: type.through });
        returns.set(key, held);
      }
    }
  }
  return returns;
}

function compareReturned(left: ApiTypeSectionEntry, right: ApiTypeSectionEntry): number {
  return successCount(right) - successCount(left) || right.returnedBy.length - left.returnedBy.length;
}

function successCount(entry: ApiTypeSectionEntry): number {
  return new Set(entry.returnedBy.filter((use) => use.status < 400).map((use) => `${use.method} ${use.path}`)).size;
}

function ownerSections(entries: ApiTypeSectionEntry[]): ApiTypeSection[] {
  const byOwner = new Map<string, { owner: Owner; entries: ApiTypeSectionEntry[] }>();
  for (const entry of entries) {
    const owner = ownerOf(entry.file);
    const held = byOwner.get(owner.name);
    if (held) held.entries.push(entry);
    else byOwner.set(owner.name, { owner, entries: [entry] });
  }
  return [...byOwner.values()].flatMap(({ owner, entries: held }) => splitLarge(owner.name, held, owner.depth));
}

function splitLarge(title: string, entries: ApiTypeSectionEntry[], depth: number): ApiTypeSection[] {
  if (entries.length <= SPLIT_ABOVE) return [section(title, entries)];
  const bySegment = new Map<string, ApiTypeSectionEntry[]>();
  const kept: ApiTypeSectionEntry[] = [];
  for (const entry of entries) {
    const segment = directorySegment(entry.file, depth);
    if (segment === null) kept.push(entry);
    else bySegment.set(segment, [...(bySegment.get(segment) ?? []), entry]);
  }
  const parts = [...bySegment.entries()].sort((left, right) => right[1].length - left[1].length);
  const sections: ApiTypeSection[] = [];
  for (const [segment, held] of parts) {
    if (held.length < MERGE_BELOW) kept.push(...held);
    else sections.push(...splitLarge(`${title} / ${segment}`, held, depth + 1));
  }
  return kept.length > 0 ? [section(title, kept), ...sections] : sections;
}

function section(title: string, entries: ApiTypeSectionEntry[]): ApiTypeSection {
  return { id: title.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), title, entries };
}

function ownerOf(file: string): Owner {
  const parts = file.split('/');
  const features = parts.findIndex((part, at) => at < parts.length - 1 && /^(features|modules|packages|apps)$/.test(part));
  if (features !== -1 && parts[features + 1] && features + 1 < parts.length - 1) {
    return { name: parts[features + 1]!, depth: features + 2 };
  }
  if (parts[0] === 'src' && parts.length > 2) return { name: parts[1]!, depth: 2 };
  return parts.length > 1 ? { name: parts[0]!, depth: 1 } : { name: 'root', depth: 0 };
}

function directorySegment(file: string, depth: number): string | null {
  const parts = file.split('/');
  return parts.length > depth + 1 ? parts[depth]! : null;
}

function typeKey(entry: ApiTypeEntry): string {
  return `${entry.file}:${entry.name}`;
}
