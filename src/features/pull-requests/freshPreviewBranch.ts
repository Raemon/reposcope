import { GithubRequestError, githubJson, githubSend } from '@/features/codebases/githubRequest';
import { requireGithubUser } from '@/features/github-auth/requireGithubUser';

const API = 'https://api.github.com';

interface PullRefs {
  head: { ref: string; sha: string };
  base: { ref: string };
}

export interface FreshPreviewBranch {
  branch: string;
  sha: string;
}

export async function createFreshPreviewBranch(owner: string, name: string, number: number): Promise<FreshPreviewBranch> {
  requireGithubUser('creating a preview branch');
  const pull = await githubJson<PullRefs>(`${API}/repos/${owner}/${name}/pulls/${number}`, true);
  const branch = previewBranchName(number);
  await createBranchAt(owner, name, branch, pull.head.sha);
  const merged = await mergeOrDropBranch(owner, name, branch, pull.base.ref);
  return { branch, sha: merged ?? pull.head.sha };
}

export function previewBranchPrefix(number: number): string {
  return `preview/pr-${number}-`;
}

function previewBranchName(number: number): string {
  return `${previewBranchPrefix(number)}${stamp()}`;
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, '');
}

async function createBranchAt(owner: string, name: string, branch: string, sha: string): Promise<void> {
  await githubSend(`${API}/repos/${owner}/${name}/git/refs`, 'POST', { ref: `refs/heads/${branch}`, sha });
}

async function mergeOrDropBranch(owner: string, name: string, branch: string, baseRef: string): Promise<string | null> {
  try {
    const merge = await githubSend<{ sha: string } | undefined>(`${API}/repos/${owner}/${name}/merges`, 'POST', {
      base: branch,
      head: baseRef,
      commit_message: `Refresh preview for ${branch} with latest ${baseRef}`,
    });
    return merge?.sha ?? null;
  } catch (issue: unknown) {
    await deleteBranch(owner, name, branch);
    throw mergeFailure(issue, baseRef);
  }
}

async function deleteBranch(owner: string, name: string, branch: string): Promise<void> {
  await githubSend(`${API}/repos/${owner}/${name}/git/refs/heads/${branch}`, 'DELETE', {}).catch(() => {});
}

function mergeFailure(issue: unknown, baseRef: string): unknown {
  if (issue instanceof GithubRequestError && issue.status === 409) {
    return new GithubRequestError(409, `the pull request conflicts with ${baseRef}; resolve it first`);
  }
  return issue;
}
