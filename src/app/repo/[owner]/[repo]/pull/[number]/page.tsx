import { PullRequestView } from '@/features/pull-requests/PullRequestView';

export default async function PullRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string; number: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { owner, repo, number } = await params;
  const { from } = await searchParams;
  return <PullRequestView owner={owner} repo={repo} number={Number(number)} acrossRepos={from === 'all'} />;
}
