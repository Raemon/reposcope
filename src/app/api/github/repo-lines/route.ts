import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { countRepoLines } from '@/features/pull-requests/repoLineCounts';
import { LOGIN_PATTERN, REF_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  return apiRoute(request, () =>
    countRepoLines(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      requireParam(request, 'ref', REF_PATTERN),
    ),
  );
}
