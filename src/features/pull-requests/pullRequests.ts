import { githubJson } from '@/features/codebases/githubRequest';

export interface PullRequestSummary {
  number: number;
  title: string;
  author: string;
  updatedAt: string;
  draft: boolean;
}

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface CommitFile {
  filename: string;
  previousFilename: string | null;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface PullRequestCommits {
  pull: PullRequestSummary;
  baseRef: string;
  headRef: string;
  commits: CommitSummary[];
}

interface GithubPull {
  number: number;
  title: string;
  user: { login: string } | null;
  updated_at: string;
  draft?: boolean;
  base: { ref: string };
  head: { ref: string };
}

interface GithubCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } | null };
  author: { login: string } | null;
  files?: {
    filename: string;
    previous_filename?: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }[];
}

const API = 'https://api.github.com';

export async function listPullRequests(owner: string, name: string): Promise<PullRequestSummary[]> {
  const pulls = await githubJson<GithubPull[]>(
    `${API}/repos/${owner}/${name}/pulls?state=open&sort=updated&direction=desc&per_page=50`,
  );
  return pulls.map(summarizePull);
}

export async function describePullRequest(owner: string, name: string, number: number): Promise<PullRequestCommits> {
  const [pull, commits] = await Promise.all([
    githubJson<GithubPull>(`${API}/repos/${owner}/${name}/pulls/${number}`),
    githubJson<GithubCommit[]>(`${API}/repos/${owner}/${name}/pulls/${number}/commits?per_page=100`),
  ]);
  return {
    pull: summarizePull(pull),
    baseRef: pull.base.ref,
    headRef: pull.head.ref,
    commits: commits.map(summarizeCommit).reverse(),
  };
}

export async function listCommitFiles(owner: string, name: string, sha: string): Promise<CommitFile[]> {
  const commit = await githubJson<GithubCommit>(`${API}/repos/${owner}/${name}/commits/${sha}`);
  return (commit.files ?? []).map((file) => ({
    filename: file.filename,
    previousFilename: file.previous_filename ?? null,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ?? null,
  }));
}

function summarizePull(pull: GithubPull): PullRequestSummary {
  return {
    number: pull.number,
    title: pull.title,
    author: pull.user?.login ?? '',
    updatedAt: pull.updated_at,
    draft: pull.draft ?? false,
  };
}

function summarizeCommit(commit: GithubCommit): CommitSummary {
  return {
    sha: commit.sha,
    message: commit.commit.message.split('\n')[0] ?? '',
    author: commit.author?.login ?? commit.commit.author?.name ?? '',
    date: commit.commit.author?.date ?? '',
  };
}
