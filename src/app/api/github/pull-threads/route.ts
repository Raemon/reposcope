import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { listReviewThreads } from '@/features/pull-requests/reviewThreads';
import { PULL_NUMBER_PATTERN } from '@/features/pull-requests/routeParams';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  return apiRoute(request, () =>
    listReviewThreads(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', PULL_NUMBER_PATTERN)),
    ),
  );
}
