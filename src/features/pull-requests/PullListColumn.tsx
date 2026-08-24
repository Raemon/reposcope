'use client';

import { AllPullRequestList } from './AllPullRequestList';
import { ColumnPreview, type PreviewToken } from './ColumnPreview';
import { PullRequestList } from './PullRequestMenu';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import { useStandingPulls, useStandingRepoPulls } from './pullActionStore';
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
  const standingPulls = useStandingRepoPulls(owner, repo, pulls);
  return (
    <ResizableColumn
      icon={ICON}
      title="pull requests"
      preview={<ColumnPreview tokens={standingPulls.map((pull) => pullToken(pull, `${owner}/${repo}`, pull.number === number))} />}
      size={size}
      onSize={onSize}
    >
      <PullRequestList repo={{ owner, name: repo }} />
    </ResizableColumn>
  );
}

export function AllPullsColumn({ owner, repo, number, size, onSize }: PullColumn) {
  const { found } = useAllPullRequests();
  const standingPulls = useStandingPulls(found?.pulls);
  return (
    <ResizableColumn
      icon={ICON}
      title="pull requests"
      preview={
        <ColumnPreview
          tokens={standingPulls.map((pull) =>
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
