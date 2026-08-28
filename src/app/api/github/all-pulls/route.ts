import { GithubRequestError } from '@/features/codebases/githubRequest';
import { apiRoute } from '@/features/github-auth/apiRoute';
import { pullStateParam } from '@/features/pull-requests/pullPaths';
import { listPullRequestsAcross, MAX_SCANNED_REPOS } from '@/features/pull-requests/pullRequests';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  return apiRoute(request, () => listPullRequestsAcross(requestedRepos(request), pullStateParam(request)));
}

function requestedRepos(request: Request): RepoRef[] {
  const raw = new URL(request.url).searchParams.get('repos') ?? '';
  const repos = raw
    .split(',')
    .filter((entry) => entry !== '')
    .map(parseRepoParam);
  if (repos.length === 0) throw new GithubRequestError(400, 'Missing or invalid repos');
  return repos.slice(0, MAX_SCANNED_REPOS);
}

function parseRepoParam(entry: string): RepoRef {
  const [owner, name] = entry.split('/');
  if (!owner || !name || !LOGIN_PATTERN.test(owner) || !REPO_NAME_PATTERN.test(name)) {
    throw new GithubRequestError(400, `Not a repository: ${entry}`);
  }
  return { owner, name };
}
