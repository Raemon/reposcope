export type CodebaseSource =
  | { kind: 'repo'; owner: string; name: string }
  | { kind: 'owner'; login: string }
  | { kind: 'viewer' };

export const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const REPO_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
export const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
export const REF_PATTERN = /^(?!.*\.\.)[A-Za-z0-9._/-]{1,255}$/;
const MAX_SOURCES = 40;

export function sourceKey(source: CodebaseSource): string {
  return serializeSource(source).toLowerCase();
}

export function serializeSource(source: CodebaseSource): string {
  switch (source.kind) {
    case 'repo':
      return `repo:${source.owner}/${source.name}`;
    case 'owner':
      return `owner:${source.login}`;
    case 'viewer':
      return 'viewer';
  }
}

function parseSource(raw: unknown): CodebaseSource | null {
  if (typeof raw !== 'string') return null;
  if (raw === 'viewer') return { kind: 'viewer' };
  const owner = raw.match(/^owner:(.+)$/);
  if (owner?.[1] && LOGIN_PATTERN.test(owner[1])) return { kind: 'owner', login: owner[1] };
  const repo = raw.match(/^repo:([^/]+)\/(.+)$/);
  if (repo?.[1] && repo[2] && LOGIN_PATTERN.test(repo[1]) && REPO_NAME_PATTERN.test(repo[2])) {
    return { kind: 'repo', owner: repo[1], name: repo[2] };
  }
  return null;
}

export function parseSources(raw: string | null): CodebaseSource[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeSources(parsed.map(parseSource).filter((source) => source !== null));
  } catch {
    return [];
  }
}

export function normalizeSources(sources: CodebaseSource[]): CodebaseSource[] {
  const seen = new Set<string>();
  const kept: CodebaseSource[] = [];
  for (const source of sources) {
    const key = sourceKey(source);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(source);
  }
  return kept.slice(0, MAX_SOURCES);
}
