import { describeRepo } from '@/features/codebases/repoDirectory';
import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  return apiRoute(request, () =>
    describeRepo(requireParam(request, 'owner', LOGIN_PATTERN), requireParam(request, 'name', REPO_NAME_PATTERN)),
  );
}
