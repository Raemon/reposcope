import { githubJson } from '@/features/codebases/githubRequest';
import type { ActivitySummary, CommitInfo } from './insightTypes';

interface GithubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string | null; date: string } | null;
  };
  author: { login: string } | null;
}

const COMMITS_SHOWN = 30;

export async function fetchRepoActivity(owner: string, repo: string): Promise<ActivitySummary | null> {
  try {
    const commits = await githubJson<GithubCommit[]>(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${COMMITS_SHOWN}`,
    );
    return { commits: commits.map(commitInfo) };
  } catch {
    return null;
  }
}

function commitInfo(commit: GithubCommit): CommitInfo {
  return {
    sha: commit.sha.slice(0, 7),
    message: commit.commit.message.split('\n')[0]!.slice(0, 160),
    author: commit.author?.login ?? commit.commit.author?.name ?? 'unknown',
    date: commit.commit.author?.date ?? '',
  };
}
