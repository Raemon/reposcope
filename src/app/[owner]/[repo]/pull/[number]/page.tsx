import { CentralLayoutProvider } from '@/features/pull-requests/centralLayout';
import { ColumnNavProvider } from '@/features/pull-requests/columnNav';
import { PullRequestView } from '@/features/pull-requests/PullRequestView';

export default async function PullRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string; number: string }>;
  searchParams: Promise<{ from?: string; file?: string; commit?: string }>;
}) {
  const { owner, repo, number } = await params;
  const { from, file, commit } = await searchParams;
  return (
    <ColumnNavProvider>
      <CentralLayoutProvider>
        <PullRequestView
          owner={owner}
          repo={repo}
          number={Number(number)}
          acrossRepos={from === 'all'}
          wantedFile={file ?? null}
          wantedCommit={commit ?? null}
        />
      </CentralLayoutProvider>
    </ColumnNavProvider>
  );
}
