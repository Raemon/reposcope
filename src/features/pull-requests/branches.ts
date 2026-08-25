import { githubJson } from '@/features/codebases/githubRequest';
import {
  changedFile,
  summarizeCommits,
  type ChangedFileSet,
  type ChangeSummary,
  type GithubChangedFile,
  type GithubCommit,
} from './pullRequests';

export interface BranchPull {
  number: number;
  state: string;
  merged: boolean;
}

export interface BranchSummary {
  name: string;
  headSha: string;
  updatedAt: string;
  pull: BranchPull | null;
  mergedAndUnchanged: boolean;
}

export interface BranchChanges extends ChangeSummary {
  branch: string;
  baseRef: string;
  headRef: string;
}

interface GithubBranch {
  name: string;
  commit: { sha: string };
}

interface GithubRefPull {
  number: number;
  state: string;
  updated_at: string;
  merged_at: string | null;
  head: { ref: string; sha: string; repo?: { full_name: string } | null };
}

interface GithubGitCommit {
  committer?: { date?: string } | null;
  author?: { date?: string } | null;
}

interface GithubCompare {
  merge_base_commit: { sha: string };
  commits: GithubCommit[];
  files?: GithubChangedFile[];
}

const API = 'https://api.github.com';
const BRANCH_LIMIT = 100;
const BRANCH_DATE_WORKERS = 8;

export async function listBranches(owner: string, name: string): Promise<BranchSummary[]> {
  const [all, repo, pulls] = await Promise.all([
    githubJson<GithubBranch[]>(`${API}/repos/${owner}/${name}/branches?per_page=${BRANCH_LIMIT}`),
    githubJson<{ default_branch: string }>(`${API}/repos/${owner}/${name}`),
    recentPulls(owner, name),
  ]);
  const branches = all.filter((branch) => branch.name !== repo.default_branch);
  const dates = await branchDates(owner, name, branches);
  return branches
    .map((branch) => summarizeBranch(branch, pulls.get(branch.name) ?? null, dates.get(branch.commit.sha) ?? ''))
    .sort(byUnsettledThenRecent);
}

export async function describeBranch(owner: string, name: string, branch: string, fresh = false): Promise<BranchChanges> {
  const { base, compare } = await compareWithDefault(owner, name, branch, fresh);
  const files = compare.files ?? [];
  return {
    branch,
    baseRef: base,
    headRef: branch,
    additions: totalOf(files, (file) => file.additions),
    deletions: totalOf(files, (file) => file.deletions),
    commits: await summarizeCommits(owner, name, compare.commits),
  };
}

export async function listBranchFiles(owner: string, name: string, branch: string, fresh = false): Promise<ChangedFileSet> {
  const { compare } = await compareWithDefault(owner, name, branch, fresh);
  return {
    baseRef: compare.merge_base_commit.sha,
    headRef: headShaOf(compare),
    files: (compare.files ?? []).map(changedFile),
  };
}

async function compareWithDefault(owner: string, name: string, branch: string, fresh: boolean) {
  const repo = await githubJson<{ default_branch: string }>(`${API}/repos/${owner}/${name}`, fresh);
  const range = `${encodeURIComponent(repo.default_branch)}...${encodeURIComponent(branch)}`;
  return {
    base: repo.default_branch,
    compare: await githubJson<GithubCompare>(`${API}/repos/${owner}/${name}/compare/${range}`, fresh),
  };
}

function headShaOf(compare: GithubCompare): string {
  return compare.commits[compare.commits.length - 1]?.sha ?? compare.merge_base_commit.sha;
}

async function recentPulls(owner: string, name: string): Promise<Map<string, GithubRefPull>> {
  const pulls = await githubJson<GithubRefPull[]>(
    `${API}/repos/${owner}/${name}/pulls?state=all&sort=updated&direction=desc&per_page=${BRANCH_LIMIT}`,
  );
  const byRef = new Map<string, GithubRefPull>();
  for (const pull of pulls) {
    if (pull.head.repo?.full_name === `${owner}/${name}` && !byRef.has(pull.head.ref)) byRef.set(pull.head.ref, pull);
  }
  return byRef;
}

// /branches omits dates; /git/commits/<sha> caches immutably, so one fetch per new head
async function branchDates(owner: string, name: string, branches: GithubBranch[]): Promise<Map<string, string>> {
  const queue = branches.map((branch) => branch.commit.sha);
  const dates = new Map<string, string>();
  const read = async () => {
    for (let sha = queue.shift(); sha; sha = queue.shift()) dates.set(sha, await commitDate(owner, name, sha));
  };
  await Promise.all(Array.from({ length: Math.min(BRANCH_DATE_WORKERS, queue.length) }, read));
  return dates;
}

async function commitDate(owner: string, name: string, sha: string): Promise<string> {
  try {
    const commit = await githubJson<GithubGitCommit>(`${API}/repos/${owner}/${name}/git/commits/${sha}`);
    return commit.committer?.date ?? commit.author?.date ?? '';
  } catch {
    return '';
  }
}

function summarizeBranch(branch: GithubBranch, pull: GithubRefPull | null, updatedAt: string): BranchSummary {
  const merged = pull?.merged_at != null;
  return {
    name: branch.name,
    headSha: branch.commit.sha,
    updatedAt,
    pull: pull && { number: pull.number, state: pull.state, merged },
    mergedAndUnchanged: merged && pull?.head.sha === branch.commit.sha,
  };
}

function byUnsettledThenRecent(a: BranchSummary, b: BranchSummary): number {
  return Number(a.mergedAndUnchanged) - Number(b.mergedAndUnchanged) || b.updatedAt.localeCompare(a.updatedAt);
}

function totalOf<T>(items: T[], count: (item: T) => number): number {
  return items.reduce((held, item) => held + count(item), 0);
}
