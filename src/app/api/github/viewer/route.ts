import { listViewerRepos } from '@/features/codebases/repoDirectory';
import { apiRoute } from '@/features/github-auth/apiRoute';
import { parseGithubAccess } from '@/features/github-auth/githubAccess';

export async function GET(request: Request) {
  const access = parseGithubAccess(new URL(request.url).searchParams.get('access'));
  return apiRoute(request, () => listViewerRepos(access));
}
