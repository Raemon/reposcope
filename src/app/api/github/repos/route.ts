import { listOwnerRepos } from '@/features/codebases/repoDirectory';
import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { LOGIN_PATTERN } from '@/features/sources/sourceTypes';

export async function GET(request: Request) {
  return apiRoute(request, () => listOwnerRepos(requireParam(request, 'owner', LOGIN_PATTERN)));
}
