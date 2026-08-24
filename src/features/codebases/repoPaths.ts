import { parseRepoLink, type RepoRef } from '@/features/sources/parseRepoLink';

export function repoHref(owner: string, repo: string): string {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function pullHref(owner: string, repo: string, number: number): string {
  return `${repoHref(owner, repo)}/pull/${number}`;
}

export function pullBeingRead(pathname: string): number | null {
  const match = pathname.match(/^\/[^/]+\/[^/]+\/pull\/([0-9]{1,9})(?:\/|$)/);
  return match?.[1] ? Number(match[1]) : null;
}

export function repoBeingRead(pathname: string): RepoRef | null {
  const segments = pathname.match(/^\/([^/]+)\/([^/]+)(?:\/|$)/);
  if (!segments?.[1] || !segments[2]) return null;
  try {
    const parsed = parseRepoLink(`${decodeURIComponent(segments[1])}/${decodeURIComponent(segments[2])}`);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}
