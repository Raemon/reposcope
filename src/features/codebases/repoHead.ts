import { githubJsonIfChanged } from './githubRequest';

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface RepoHead {
  sha: string;
  commits: CommitInfo[];
}

interface GithubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string | null; date: string } | null;
  };
  author: { login: string } | null;
}

const COMMITS_SHOWN = 30;
const MAX_CACHED = 64;

const cache = new Map<string, { etag: string | null; head: RepoHead }>();

export async function resolveRepoHead(owner: string, repo: string): Promise<RepoHead> {
  const key = `${owner}/${repo}`;
  const held = cache.get(key);
  const fresh = await githubJsonIfChanged<GithubCommit[]>(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${COMMITS_SHOWN}`,
    held?.etag ?? null,
  );
  if (fresh === null && held) return held.head;
  const commits = fresh?.value ?? [];
  const sha = commits[0]?.sha;
  if (!sha) throw new Error(`No commits found for ${owner}/${repo}`);
  const head = { sha, commits: commits.map(commitInfo) };
  cache.set(key, { etag: fresh?.etag ?? null, head });
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
  return head;
}

function commitInfo(commit: GithubCommit): CommitInfo {
  return {
    sha: commit.sha.slice(0, 7),
    message: commit.commit.message.split('\n')[0]!.slice(0, 160),
    author: commit.author?.login ?? commit.commit.author?.name ?? 'unknown',
    date: commit.commit.author?.date ?? '',
  };
}
