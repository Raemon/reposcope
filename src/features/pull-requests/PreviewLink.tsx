'use client';

import { useCurrentPull } from './currentPullStore';
import { PreviewMenu, StateDot, previewName } from './PreviewMenu';
import type { PreviewEntry } from './pullPreviews';
import { commitsBehind, usePullPreviews, type PreviewControls } from './usePullPreviews';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { FailureNote } from '@/features/surface-ui/FailureNote';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

const LEFT_SEGMENT = 'flex items-center gap-1.5 rounded-l py-1 pl-2 pr-1.5 text-[10px] uppercase tracking-[0.18em]';

export function PreviewLink({ repo, number }: { repo: RepoRef; number: number }) {
  const pull = useCurrentPull(repo.owner, repo.name, number);
  const previews = usePullPreviews(repo, number);
  if (pull === null) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      {previews.failure !== null && <FailureNote label={previews.failure} />}
      <div className="flex shrink-0 items-stretch rounded bg-btn text-ink-dim">
        <PreviewSegment previews={previews} number={number} />
        <span aria-hidden className="my-1 w-px shrink-0 bg-panel-edge" />
        <PreviewMenu previews={previews} number={number} baseRef={pull.baseRef} />
      </div>
    </div>
  );
}

function PreviewSegment({ previews, number }: { previews: PreviewControls; number: number }) {
  const { best } = previews;
  if (best === null || best.url === null) {
    return (
      <HoverCardTrigger label={missingLabel(previews, number)} focusable={false} tooltipStyle>
        <span className={`${LEFT_SEGMENT} opacity-40`}>
          <StateDot state={previews.headState} />
          Preview
        </span>
      </HoverCardTrigger>
    );
  }
  return (
    <HoverCardTrigger label={openLabel(previews, best, number)} focusable={false} tooltipStyle>
      <a
        href={best.url}
        target="_blank"
        rel="noreferrer"
        className={`${LEFT_SEGMENT} hover:bg-btn-hover hover:text-ink ${previews.upToDate ? '' : 'text-warn-edge'}`}
      >
        <StateDot state={previews.upToDate ? 'ready' : 'behind'} />
        Preview
        {!previews.upToDate && <BehindNote previews={previews} />}
      </a>
    </HoverCardTrigger>
  );
}

function BehindNote({ previews }: { previews: PreviewControls }) {
  const behind = commitsBehind(previews);
  return <span className="text-[9px] normal-case tracking-normal">{behind === null ? 'behind' : `${behind} behind`}</span>;
}

function missingLabel(previews: PreviewControls, number: number): string {
  if (!previews.loaded) return `Looking for preview deployments of #${number}…`;
  if (previews.headState === 'building') return `The preview for the latest commit of #${number} is still building`;
  if (previews.headState === 'failed') return `The preview for the latest commit of #${number} failed to deploy`;
  return `#${number} has no preview deployment yet`;
}

function openLabel(previews: PreviewControls, best: PreviewEntry, number: number): string {
  const built = previewName(best);
  if (previews.upToDate) return `Open the preview of ${built}, the latest commit of #${number}`;
  return `Behind: previews ${built}; the latest commit's preview ${headWording(previews)}`;
}

function headWording(previews: PreviewControls): string {
  if (previews.headState === 'building') return 'is still building';
  if (previews.headState === 'failed') return 'failed';
  return 'does not exist';
}
