import { encodePath } from './repoFiles';
import { countTarballLines } from './tarLineCounter';
import { githubDerived, githubJson } from '@/features/codebases/githubRequest';

export interface RepoLineCounts {
  lines: Record<string, number>;
}

const API = 'https://api.github.com';

export async function countRepoLines(owner: string, name: string, ref: string): Promise<RepoLineCounts> {
  const { sha } = await githubJson<{ sha: string }>(`${API}/repos/${owner}/${name}/commits/${encodePath(ref)}`);
  return { lines: await githubDerived(`${API}/repos/${owner}/${name}/tarball/${sha}`, 'line-counts', countTarballLines) };
}
