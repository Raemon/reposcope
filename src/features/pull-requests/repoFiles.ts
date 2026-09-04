import { githubJson } from '@/features/codebases/githubRequest';

export interface RepoFileSet {
  ref: string;
  sha: string;
  files: string[];
  truncated: boolean;
}

interface GithubTree {
  truncated: boolean;
  tree: { path: string; type: string }[];
}

const API = 'https://api.github.com';
const COMMIT_SHA = /^[0-9a-f]{40}$/;

export async function listRepoFiles(owner: string, name: string, fresh = false, at?: string): Promise<RepoFileSet> {
  const ref = at ?? (await githubJson<{ default_branch: string }>(`${API}/repos/${owner}/${name}`, fresh)).default_branch;
  const sha = await resolveCommit(owner, name, ref, fresh);
  const tree = await githubJson<GithubTree>(`${API}/repos/${owner}/${name}/git/trees/${sha}?recursive=1`);
  return { ref, sha, truncated: tree.truncated, files: blobPaths(tree) };
}

export async function resolveCommit(owner: string, name: string, ref: string, fresh = false): Promise<string> {
  if (COMMIT_SHA.test(ref)) return ref;
  const commit = await githubJson<{ sha: string }>(`${API}/repos/${owner}/${name}/commits/${encodePath(ref)}`, fresh);
  return commit.sha;
}

export function encodePath(ref: string): string {
  return ref.split('/').map(encodeURIComponent).join('/');
}

function blobPaths(tree: GithubTree): string[] {
  return tree.tree.filter((entry) => entry.type === 'blob').map((entry) => entry.path).sort();
}
