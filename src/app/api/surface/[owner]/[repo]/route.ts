import { codebaseApiSurface } from '@/features/api-surface/apiCatalogCache';
import { describeRepo } from '@/features/codebases/repoDirectory';
import type { RepoSurfacePayload } from '@/features/codebases/repoSurfacePayload';
import { apiRoute } from '@/features/github-auth/apiRoute';

export const maxDuration = 300;

export async function GET(request: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  return apiRoute(request, async (): Promise<RepoSurfacePayload> => {
    await describeRepo(owner, repo);
    const { codebase, endpoints, typeSections, routes, fetchedInMs, analyzedInMs } = await codebaseApiSurface(
      owner,
      repo,
    );
    const read = `${codebase.files.length} source files · fetched in ${seconds(fetchedInMs)} · analyzed in ${seconds(
      analyzedInMs,
    )}${codebase.truncated ? ' · truncated' : ''}`;
    return { heading: `${owner}/${repo}`, read, endpoints, typeSections, routes };
  });
}

function seconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}
