import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { createFreshPreviewBranch } from '@/features/pull-requests/freshPreviewBranch';
import { PULL_NUMBER_PATTERN } from '@/features/pull-requests/routeParams';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function POST(request: Request) {
  return apiRoute(request, () =>
    createFreshPreviewBranch(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', PULL_NUMBER_PATTERN)),
    ),
  );
}
