import { listViewerRepos } from '@/features/codebases/repoDirectory';
import { apiRoute } from '@/features/github-auth/apiRoute';

export async function GET(request: Request) {
  return apiRoute(request, listViewerRepos);
}
