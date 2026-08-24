'use client';

import { AllPullRequestList } from './AllPullRequestList';
import { ColumnPreview, type PreviewToken } from './ColumnPreview';
import { PullRequestList } from './PullRequestMenu';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import { repoPullsPath } from './pullPaths';
import type { PullRequestSummary } from './pullRequests';
import { useAllPullRequests } from './useAllPullRequests';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

const ICON = '⇅';

export interface PullColumn {
  owner: string;
  repo: string;
  number: number;
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
}

export function RepoPullsColumn({ owner, repo, number, size, onSize }: PullColumn) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data: pulls } = useCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo), token, ready);
  return (
    <ResizableColumn
      icon={ICON}
      title="pull request"
      count={pulls?.length}
      preview={<ColumnPreview tokens={(pulls ?? []).map((pull) => pullToken(pull, `${owner}/${repo}`, pull.number === number))} />}
      size={size}
      onSize={onSize}
    >
      <PullRequestList repo={{ owner, name: repo }} />
    </ResizableColumn>
  );
}

export function AllPullsColumn({ owner, repo, number, size, onSize }: PullColumn) {
  const { found } = useAllPullRequests();
  const pulls = found?.pulls;
  return (
    <ResizableColumn
      icon={ICON}
      title="pull request"
      count={pulls?.length}
      preview={
        <ColumnPreview
          tokens={(pulls ?? []).map((pull) =>
            pullToken(
              pull,
              `${pull.owner}/${pull.repo}`,
              pull.number === number && pull.owner === owner && pull.repo === repo,
            ),
          )}
        />
      }
      size={size}
      onSize={onSize}
    >
      <AllPullRequestList />
    </ResizableColumn>
  );
}

function pullToken(pull: PullRequestSummary, slug: string, accent: boolean): PreviewToken {
  return {
    key: `${slug}#${pull.number}`,
    label: String(pull.number).slice(-2),
    title: `${slug} #${pull.number} · ${pull.title}`,
    accent,
  };
}
