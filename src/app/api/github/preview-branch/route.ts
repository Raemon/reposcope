import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { createFreshPreviewBranch } from '@/features/pull-requests/freshPreviewBranch';
import { previewUrlForRef } from '@/features/pull-requests/previewDeployment';
import { BRANCH_NAME_PATTERN, PULL_NUMBER_PATTERN } from '@/features/pull-requests/routeParams';
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

export async function GET(request: Request) {
  return apiRoute(request, async () => ({
    url: await previewUrlForRef(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      requireParam(request, 'ref', BRANCH_NAME_PATTERN),
    ),
  }));
}
