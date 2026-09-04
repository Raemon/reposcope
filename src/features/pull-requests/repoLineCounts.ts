import { resolveCommit } from './repoFiles';
import { countTarballLines } from './tarLineCounter';
import { githubDerived } from '@/features/codebases/githubRequest';

export interface RepoLineCounts {
  lines: Record<string, number>;
}

const API = 'https://api.github.com';

export async function countRepoLines(owner: string, name: string, ref: string): Promise<RepoLineCounts> {
  const sha = await resolveCommit(owner, name, ref);
  return { lines: await githubDerived(`${API}/repos/${owner}/${name}/tarball/${sha}`, 'line-counts', countTarballLines) };
}
