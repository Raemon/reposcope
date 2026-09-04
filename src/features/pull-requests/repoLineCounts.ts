import { resolveCommit } from './repoFiles';
import { countTarballLines, type TarballLines } from './tarLineCounter';
import { githubDerived } from '@/features/codebases/githubRequest';

export type RepoLineCounts = TarballLines;

const API = 'https://api.github.com';
// Bump when countTarballLines changes: derived results are cached forever under this name.
const DERIVATION = 'line-counts@2';

export async function countRepoLines(owner: string, name: string, ref: string): Promise<RepoLineCounts> {
  const sha = await resolveCommit(owner, name, ref);
  return githubDerived(`${API}/repos/${owner}/${name}/tarball/${sha}`, DERIVATION, countTarballLines);
}
