import { PullRequestView } from '@/features/pull-requests/PullRequestView';

export default async function PullRequestPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; number: string }>;
}) {
  const { owner, repo, number } = await params;
  return <PullRequestView owner={owner} repo={repo} number={Number(number)} />;
}
