import { RepoSurface } from '@/features/codebases/RepoSurface';

export default async function RepoApiPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  return <RepoSurface owner={owner} repo={repo} />;
}
