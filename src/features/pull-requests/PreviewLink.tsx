'use client';

import { useCurrentPull } from './currentPullStore';
import { PreviewMenu, StateDot, previewName } from './PreviewMenu';
import type { PreviewEntry } from './pullPreviews';
import { usePullPreviews, type PreviewControls } from './usePullPreviews';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { CHOICE_METRICS } from '@/features/surface-ui/buttonStyles';
import { FailureNote } from '@/features/surface-ui/FailureNote';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { StrokeIcon } from '@/features/surface-ui/StrokeIcon';

const HALF = `flex items-center gap-1.5 uppercase tracking-[0.18em] ${CHOICE_METRICS}`;
const DIVIDER = <span aria-hidden className="my-1 w-px shrink-0 bg-panel-edge" />;

export function PreviewLink({ repo, number }: { repo: RepoRef; number: number }) {
  const pull = useCurrentPull(repo.owner, repo.name, number);
  const previews = usePullPreviews(repo, number);
  if (pull === null) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      {previews.failure !== null && <FailureNote label={previews.failure} />}
      <div className="flex shrink-0 items-stretch rounded bg-btn text-ink-dim">
        <PreviewHalf previews={previews} number={number} />
        {DIVIDER}
        <PreviewMenu previews={previews} number={number} />
        {DIVIDER}
        <RefreshHalf previews={previews} number={number} />
      </div>
    </div>
  );
}

function PreviewHalf({ previews, number }: { previews: PreviewControls; number: number }) {
  const { best } = previews;
  if (best === null || best.url === null) {
    return (
      <HoverCardTrigger label={missingLabel(previews, number)} focusable={false} tooltipStyle>
        <span className={`${HALF} rounded-l opacity-40`}>
          <StateDot state={previews.headState} />
          Preview
        </span>
      </HoverCardTrigger>
    );
  }
  return (
    <HoverCardTrigger label={openLabel(previews, best, number)} focusable={false} tooltipStyle>
      <a href={best.url} target="_blank" rel="noreferrer" className={`${HALF} rounded-l hover:bg-btn-hover hover:text-ink ${previews.upToDate ? '' : 'text-warn-edge'}`}>
        <StateDot state={previews.upToDate ? 'ready' : 'behind'} />
        Preview
      </a>
    </HoverCardTrigger>
  );
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

function RefreshHalf({ previews, number }: { previews: PreviewControls; number: number }) {
  const working = previews.creating || previews.awaiting !== null;
  const urging = !working && headLacksPreview(previews);
  return (
    <HoverCardTrigger label={refreshLabel(previews, number)} focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={previews.refresh}
        disabled={working}
        aria-label={`Build a fresh preview branch for #${number}`}
        className={`${HALF} rounded-r hover:bg-accent/20 hover:text-accent disabled:opacity-40 disabled:hover:bg-transparent ${urging ? 'text-accent' : ''}`}
      >
        <RefreshIcon spinning={working} />
      </button>
    </HoverCardTrigger>
  );
}

function headLacksPreview(previews: PreviewControls): boolean {
  return previews.loaded && !previews.upToDate && previews.headState !== 'building';
}

function refreshLabel(previews: PreviewControls, number: number): string {
  if (previews.creating) return 'Creating a fresh preview branch…';
  if (previews.awaiting !== null) return 'Waiting for the fresh preview branch to deploy…';
  const why = previews.upToDate ? 'for a preview that is up to date' : 'so the latest commit gets a preview';
  return `Branch #${number} afresh with the latest base branch merged in, ${why}`;
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <StrokeIcon size={12} className={spinning ? 'animate-spin' : undefined}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </StrokeIcon>
  );
}
