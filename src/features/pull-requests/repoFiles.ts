import { githubJson } from '@/features/codebases/githubRequest';

export interface RepoFileSet {
  ref: string;
  files: string[];
  truncated: boolean;
}

interface GithubTree {
  truncated: boolean;
  tree: { path: string; type: string }[];
}

const API = 'https://api.github.com';

export async function listRepoFiles(owner: string, name: string, fresh = false): Promise<RepoFileSet> {
  const { default_branch: ref } = await githubJson<{ default_branch: string }>(`${API}/repos/${owner}/${name}`, fresh);
  const tree = await githubJson<GithubTree>(
    `${API}/repos/${owner}/${name}/git/trees/${encodePath(ref)}?recursive=1`,
    fresh,
  );
  return { ref, truncated: tree.truncated, files: blobPaths(tree) };
}

function encodePath(ref: string): string {
  return ref.split('/').map(encodeURIComponent).join('/');
}

function blobPaths(tree: GithubTree): string[] {
  return tree.tree.filter((entry) => entry.type === 'blob').map((entry) => entry.path).sort();
}
