import type { DefinitionSite } from '@/features/pull-requests/definitionResolver';

export type { DefinitionSite };

export const LIB_REF = '__lib';

const TYPESCRIPT_PATH = /\.(?:[cm]?[jt]sx?)$/i;

export function isTypescriptPath(path: string): boolean {
  return TYPESCRIPT_PATH.test(path);
}

export interface HoverInfo {
  signature: string;
  docs: string | null;
}

export interface ReferenceSite {
  path: string;
  ref: string;
  line: number;
  column: number;
  text: string;
  definition: boolean;
}

export interface CodePosition {
  ref: string;
  path: string;
  line: number;
  column: number;
}

export type CodeIntelQuery =
  | ({ op: 'definition' } & CodePosition)
  | ({ op: 'hover' } & CodePosition)
  | ({ op: 'references'; seeds?: string[] } & CodePosition)
  | { op: 'warm'; ref: string; seeds?: string[] };

export type CodeIntelResult<Q extends CodeIntelQuery> = Q extends { op: 'definition' }
  ? DefinitionSite[]
  : Q extends { op: 'hover' }
    ? HoverInfo | null
    : Q extends { op: 'references' }
      ? ReferenceSite[]
      : null;

export interface Listing {
  files: string[];
  truncated: boolean;
}

export type FileRead = string | null | { error: string };

export interface Source {
  listing(ref: string): Promise<Listing | null>;
  read(ref: string, paths: string[]): Promise<FileRead[]>;
}

export type ToWorker =
  | { kind: 'query'; id: number; query: CodeIntelQuery }
  | { kind: 'files'; id: number; texts: FileRead[] }
  | { kind: 'listing'; id: number; listing: Listing | null; error?: string };

export type FromWorker =
  | { kind: 'need'; id: number; ref: string; paths: string[] }
  | { kind: 'listing'; id: number; ref: string }
  | { kind: 'result'; id: number; result: unknown }
  | { kind: 'error'; id: number; message: string };
