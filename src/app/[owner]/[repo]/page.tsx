import { RepoPullsSurface } from '@/features/pull-requests/PullsSurface';

export default async function RepoPullsPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  return <RepoPullsSurface owner={owner} repo={repo} />;
}
