import { parseRepoLink, type RepoRef } from '@/features/sources/parseRepoLink';

export interface PullRead {
  owner: string;
  repo: string;
  number: number;
}

const GITHUB = 'https://github.com';

export function repoRoute(owner: string, repo: string): string {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function githubRepoUrl(owner: string, repo: string): string {
  return `${GITHUB}/${owner}/${repo}`;
}

export function githubPullUrl(owner: string, repo: string, number: number): string {
  return `${githubRepoUrl(owner, repo)}/pull/${number}`;
}

export function githubBranchUrl(owner: string, repo: string, branch: string): string {
  return `${githubRepoUrl(owner, repo)}/tree/${encodeURI(branch)}`;
}

export function pullTargetBeingRead(pathname: string): PullRead | null {
  const repo = repoBeingRead(pathname);
  const number = pullBeingRead(pathname);
  return repo && number !== null ? { owner: repo.owner, repo: repo.name, number } : null;
}

export function changeBeingRead(pathname: string): boolean {
  return repoBeingRead(pathname) !== null && (pullBeingRead(pathname) !== null || branchBeingRead(pathname) !== null);
}

export function githubUrlBeingRead(pathname: string): string | null {
  const repo = repoBeingRead(pathname);
  if (!repo) return null;
  const pull = pullBeingRead(pathname);
  if (pull !== null) return githubPullUrl(repo.owner, repo.name, pull);
  const branch = branchBeingRead(pathname);
  return branch === null ? githubRepoUrl(repo.owner, repo.name) : githubBranchUrl(repo.owner, repo.name, branch);
}

export function pullBeingRead(pathname: string): number | null {
  const match = pathname.match(/^\/[^/]+\/[^/]+\/pull\/([0-9]{1,9})(?:\/|$)/);
  return match?.[1] ? Number(match[1]) : null;
}

export function branchBeingRead(pathname: string): string | null {
  const match = pathname.match(/^\/[^/]+\/[^/]+\/branch\/(.+)$/);
  if (!match?.[1]) return null;
  try {
    return match[1].split('/').map(decodeURIComponent).join('/');
  } catch {
    return match[1];
  }
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
