import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { listRepoFiles } from '@/features/pull-requests/repoFiles';
import { LOGIN_PATTERN, REF_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get('ref');
  return apiRoute(request, () =>
    listRepoFiles(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      new URL(request.url).searchParams.get('fresh') === '1',
      ref === null ? undefined : requireParam(request, 'ref', REF_PATTERN),
    ),
  );
}
