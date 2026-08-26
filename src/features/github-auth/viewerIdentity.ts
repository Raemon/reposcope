import { githubJson, GithubRequestError } from '@/features/codebases/githubRequest';
import { userGithubToken } from '@/features/codebases/githubToken';

export interface ViewerIdentity {
  login: string;
}

export async function describeViewer(): Promise<ViewerIdentity> {
  if (!userGithubToken()) throw new GithubRequestError(401, 'GitHub is not connected');
  const { login } = await githubJson<{ login: string }>('https://api.github.com/user');
  return { login };
}
