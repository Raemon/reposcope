import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { listBranchFiles } from '@/features/pull-requests/branches';
import { BRANCH_NAME_PATTERN } from '@/features/pull-requests/routeParams';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  return apiRoute(request, () =>
    listBranchFiles(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      requireParam(request, 'branch', BRANCH_NAME_PATTERN),
      new URL(request.url).searchParams.get('fresh') === '1',
    ),
  );
}
