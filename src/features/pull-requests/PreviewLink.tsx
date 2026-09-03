'use client';

import { useCurrentPull } from './currentPullStore';
import { useFreshPreview, type FreshPreview } from './useFreshPreview';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { CHOICE_METRICS } from '@/features/surface-ui/buttonStyles';
import { FailureNote } from '@/features/surface-ui/FailureNote';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { StrokeIcon } from '@/features/surface-ui/StrokeIcon';

const HALF = `flex items-center uppercase tracking-[0.18em] ${CHOICE_METRICS}`;

export function PreviewLink({ repo, number }: { repo: RepoRef; number: number }) {
  const pull = useCurrentPull(repo.owner, repo.name, number);
  const fresh = useFreshPreview(repo, number);
  if (pull === null) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      {fresh.failure !== null && <FailureNote label={fresh.failure} />}
      <div className="flex shrink-0 items-stretch rounded bg-btn text-ink-dim">
        <PreviewHalf url={fresh.url ?? pull.previewUrl} number={number} refreshed={fresh.url !== null} />
        <span aria-hidden className="my-1 w-px bg-panel-edge" />
        <RefreshHalf fresh={fresh} number={number} />
      </div>
    </div>
  );
}

function PreviewHalf({ url, number, refreshed }: { url: string | null; number: number; refreshed: boolean }) {
  if (url === null) {
    return (
      <HoverCardTrigger label={`#${number} has no preview deployment yet`} focusable={false} tooltipStyle>
        <span className={`${HALF} rounded-l opacity-40`}>Preview</span>
      </HoverCardTrigger>
    );
  }
  return (
    <HoverCardTrigger label={previewLabel(number, refreshed)} focusable={false} tooltipStyle>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`${HALF} rounded-l hover:bg-btn-hover hover:text-ink`}
      >
        Preview
      </a>
    </HoverCardTrigger>
  );
}

function previewLabel(number: number, refreshed: boolean): string {
  const which = refreshed ? 'freshly built preview' : 'preview deployment';
  return `Open the ${which} for #${number} in a new tab`;
}

function RefreshHalf({ fresh, number }: { fresh: FreshPreview; number: number }) {
  const working = fresh.creating || fresh.building;
  return (
    <HoverCardTrigger label={refreshLabel(fresh, number)} focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={fresh.start}
        disabled={working}
        aria-label={`Build a fresh preview branch for #${number}`}
        className={`${HALF} rounded-r px-1.5 hover:bg-accent/20 hover:text-accent disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <RefreshIcon spinning={working} />
      </button>
    </HoverCardTrigger>
  );
}

function refreshLabel(fresh: FreshPreview, number: number): string {
  if (fresh.creating) return 'Creating a fresh preview branch…';
  if (fresh.building) return `Waiting for ${fresh.branch ?? 'the new branch'} to deploy…`;
  return `Branch #${number} afresh with the latest base branch merged in, for a preview that is up to date`;
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <StrokeIcon size={12} className={spinning ? 'animate-spin' : undefined}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </StrokeIcon>
  );
}
