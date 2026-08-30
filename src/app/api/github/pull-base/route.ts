import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { BRANCH_NAME_PATTERN, PULL_NUMBER_PATTERN } from '@/features/pull-requests/routeParams';
import { retargetPullRequest } from '@/features/pull-requests/pullRequests';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function POST(request: Request) {
  return apiRoute(request, () =>
    retargetPullRequest(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', PULL_NUMBER_PATTERN)),
      requireParam(request, 'base', BRANCH_NAME_PATTERN),
    ),
  );
}
