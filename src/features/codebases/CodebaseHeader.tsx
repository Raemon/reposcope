'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CodebaseList } from './CodebaseList';
import { HeaderMenu } from './HeaderMenu';
import { sidebarGroups } from './sidebarGroups';
import { useSourceResults } from './useSourceResults';
import { ScopeMark } from '@/features/brand/ScopeMark';
import { CurrentPullTitle } from '@/features/pull-requests/CurrentPullTitle';
import { MergePullButton } from '@/features/pull-requests/MergePullButton';
import { PullRequestMenu } from '@/features/pull-requests/PullRequestMenu';
import { parseRepoLink, type RepoRef } from '@/features/sources/parseRepoLink';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { clearGithubToken, removeSource, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';

const ALL_PULLS = '/pulls';

export function CodebaseHeader() {
  const pathname = usePathname();
  const reading = repoBeingRead(pathname);
  const pullNumber = pullBeingRead(pathname);
  const readingAllPulls = pathname === ALL_PULLS;
  return (
    <header className="flex items-center gap-3 border-b border-panel-edge bg-panel px-3 py-1.5">
      <Link href="/" aria-label="reposcope home" className="shrink-0">
        <ScopeMark size={64} title="reposcope home" />
      </Link>
      <CodebaseMenu reading={reading} readingAllPulls={readingAllPulls} />
      {reading &&
        (pullNumber === null ? <PullRequestMenu repo={reading} /> : <CurrentPullTitle repo={reading} number={pullNumber} />)}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {reading && pullNumber !== null && <MergePullButton repo={reading} number={pullNumber} />}
        <ThemeToggle />
      </div>
    </header>
  );
}

function CodebaseMenu({ reading, readingAllPulls }: { reading: RepoRef | null; readingAllPulls: boolean }) {
  const ready = useStoreReady();
  const sources = useSources();
  const token = useGithubToken();
  const results = useSourceResults(sources, token, ready);
  const connected = sources.some((source) => source.kind === 'viewer');

  return (
    <HeaderMenu
      label={readingAllPulls ? 'All pull requests' : reading ? `${reading.owner}/${reading.name}` : 'Codebases'}
      width="w-80"
    >
      {() => (
        <>
          <AllPullsRow active={readingAllPulls} />
          {!ready ? (
            <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">Loading…</p>
          ) : sources.length === 0 ? (
            reading ? (
              <ReadingRow reading={reading} />
            ) : (
              <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">
                No repositories yet.{' '}
                <Link href="/" className="text-accent underline">
                  Add one
                </Link>{' '}
                to get started.
              </p>
            )
          ) : (
            <CodebaseList groups={sidebarGroups(sources, results)} />
          )}
          {connected && (
            <div className="border-t border-panel-edge px-2 py-1">
              <button
                type="button"
                onClick={() => {
                  clearGithubToken();
                  removeSource({ kind: 'viewer' });
                }}
                className="text-[10px] text-ink-dim hover:text-error-ink"
              >
                disconnect GitHub
              </button>
            </div>
          )}
        </>
      )}
    </HeaderMenu>
  );
}

function AllPullsRow({ active }: { active: boolean }) {
  return (
    <SelectableLink
      href={ALL_PULLS}
      current={active}
      className={`flex items-baseline gap-1.5 border-b border-panel-edge px-2 py-1 text-[11px] leading-4 ${
        active ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
      }`}
    >
      <span className="shrink-0">All</span>
      <span className="min-w-0 flex-1 truncate text-[9px] text-ink-dim">
        open pull requests from every codebase, newest first
      </span>
    </SelectableLink>
  );
}

function ReadingRow({ reading }: { reading: RepoRef }) {
  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      <h2 className="px-2 pt-1 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{reading.owner}</h2>
      <div className="flex items-baseline gap-1.5 bg-btn-active pr-2">
        <SelectableLink
          href={`/repo/${reading.owner}/${reading.name}`}
          current
          className="flex min-w-0 flex-1 items-baseline justify-between gap-2 py-[1px] pl-2 text-[11px] leading-4 text-accent"
        >
          <span className="truncate">{reading.name}</span>
          <span className="shrink-0 text-[9px] text-ink-dim">reading</span>
        </SelectableLink>
      </div>
    </nav>
  );
}

function pullBeingRead(pathname: string): number | null {
  const match = pathname.match(/^\/repo\/[^/]+\/[^/]+\/pull\/([0-9]{1,9})(?:\/|$)/);
  return match?.[1] ? Number(match[1]) : null;
}

function repoBeingRead(pathname: string): RepoRef | null {
  const segments = pathname.match(/^\/repo\/([^/]+)\/([^/]+)(?:\/|$)/);
  if (!segments?.[1] || !segments[2]) return null;
  try {
    const parsed = parseRepoLink(`${decodeURIComponent(segments[1])}/${decodeURIComponent(segments[2])}`);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}
