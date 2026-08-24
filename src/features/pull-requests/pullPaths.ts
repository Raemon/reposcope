import { repoRoute } from '@/features/codebases/repoPaths';

export function pullPath(owner: string, repo: string, number: number): string {
  return `/api/github/pull?${repoParams(owner, repo)}&number=${number}`;
}

export function pullFilesPath(owner: string, repo: string, number: number): string {
  return `/api/github/pull-files?${repoParams(owner, repo)}&number=${number}`;
}

export function commitFilesPath(owner: string, repo: string, sha: string): string {
  return `/api/github/commit?${repoParams(owner, repo)}&sha=${encodeURIComponent(sha)}`;
}

export function pullCommentsPath(owner: string, repo: string, number: number): string {
  return `/api/github/pull-comments?${repoParams(owner, repo)}&number=${number}`;
}

export function repoPullsPath(owner: string, repo: string): string {
  return `/api/github/pulls?${repoParams(owner, repo)}`;
}

export function mergePullPath(owner: string, repo: string, number: number): string {
  return `/api/github/merge?${repoParams(owner, repo)}&number=${number}`;
}

export function closePullPath(owner: string, repo: string, number: number): string {
  return `/api/github/close?${repoParams(owner, repo)}&number=${number}`;
}

export function pullRoute(owner: string, repo: string, number: number): string {
  return `${repoRoute(owner, repo)}/pull/${number}`;
}

export function allPullsRoute(owner: string, repo: string, number: number): string {
  return `${pullRoute(owner, repo, number)}?from=all`;
}

function repoParams(owner: string, repo: string): string {
  return `owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}`;
}
