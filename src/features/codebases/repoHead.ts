import { githubJson } from './githubRequest';

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

export async function resolveRepoHead(owner: string, repo: string): Promise<RepoHead> {
  const commits = await githubJson<GithubCommit[]>(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${COMMITS_SHOWN}`,
  );
  const sha = commits[0]?.sha;
  if (!sha) throw new Error(`No commits found for ${owner}/${repo}`);
  return { sha, commits: commits.map(commitInfo) };
}

function commitInfo(commit: GithubCommit): CommitInfo {
  return {
    sha: commit.sha.slice(0, 7),
    message: commit.commit.message.split('\n')[0]!.slice(0, 160),
    author: commit.author?.login ?? commit.commit.author?.name ?? 'unknown',
    date: commit.commit.author?.date ?? '',
  };
}
