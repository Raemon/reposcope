import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { pullStateParam } from '@/features/pull-requests/pullPaths';
import { listPullRequests } from '@/features/pull-requests/pullRequests';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  return apiRoute(request, () =>
    listPullRequests(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      pullStateParam(request),
    ),
  );
}
