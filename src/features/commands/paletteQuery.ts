export type PaletteKind = 'command' | 'repo' | 'pull' | 'file' | 'commit' | 'branch';

export const PALETTE_KINDS: PaletteKind[] = ['command', 'repo', 'pull', 'file', 'commit', 'branch'];

export const KIND_PREFIX: Record<PaletteKind, string> = {
  command: '>',
  repo: '@',
  pull: '#',
  file: '/',
  commit: ':',
  branch: '~',
};

export const KIND_LABEL: Record<PaletteKind, string> = {
  command: 'commands',
  repo: 'repositories',
  pull: 'pull requests',
  file: 'files',
  commit: 'commits',
  branch: 'branches',
};

export interface PaletteQuery {
  kind: PaletteKind | null;
  text: string;
}

export function parsePaletteQuery(raw: string): PaletteQuery {
  const trimmed = raw.trimStart();
  const kind = PALETTE_KINDS.find((candidate) => trimmed.startsWith(KIND_PREFIX[candidate])) ?? null;
  return { kind, text: (kind ? trimmed.slice(1) : trimmed).trim() };
}
