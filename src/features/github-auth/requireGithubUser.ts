import { GithubRequestError } from '@/features/codebases/githubRequest';
import { userGithubToken } from '@/features/codebases/githubToken';

export function requireGithubUser(action: string): void {
  if (!userGithubToken()) throw new GithubRequestError(401, `Connect GitHub before ${action}`);
}
