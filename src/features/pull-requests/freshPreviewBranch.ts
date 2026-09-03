import { GithubRequestError, githubJson, githubSend } from '@/features/codebases/githubRequest';
import { requireGithubUser } from '@/features/github-auth/requireGithubUser';

const API = 'https://api.github.com';

interface PullRefs {
  head: { ref: string; sha: string };
  base: { ref: string };
}

export interface FreshPreviewBranch {
  branch: string;
}

export async function createFreshPreviewBranch(owner: string, name: string, number: number): Promise<FreshPreviewBranch> {
  requireGithubUser('creating a preview branch');
  const pull = await githubJson<PullRefs>(`${API}/repos/${owner}/${name}/pulls/${number}`, true);
  const branch = previewBranchName(number);
  await githubSend(`${API}/repos/${owner}/${name}/git/refs`, 'POST', {
    ref: `refs/heads/${branch}`,
    sha: pull.head.sha,
  });
  await mergeOrDropBranch(owner, name, branch, pull.base.ref);
  return { branch };
}

function previewBranchName(number: number): string {
  return `preview/pr-${number}-${stamp()}`;
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
}

async function mergeOrDropBranch(owner: string, name: string, branch: string, baseRef: string): Promise<void> {
  try {
    await githubSend(`${API}/repos/${owner}/${name}/merges`, 'POST', {
      base: branch,
      head: baseRef,
      commit_message: `Refresh preview for ${branch} with latest ${baseRef}`,
    });
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
