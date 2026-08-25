'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CodebaseList } from './CodebaseList';
import { HeaderMenu } from './HeaderMenu';
import { pullBeingRead, repoBeingRead, repoRoute } from './repoPaths';
import { sidebarGroups } from './sidebarGroups';
import { useSourceResults } from './useSourceResults';
import { ScopeMark } from '@/features/brand/ScopeMark';
import { CurrentPullTitle } from '@/features/pull-requests/CurrentPullTitle';
import { MergePullButton } from '@/features/pull-requests/MergePullButton';
import { PullRequestMenu } from '@/features/pull-requests/PullRequestMenu';
import { type RepoRef } from '@/features/sources/parseRepoLink';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { disconnectGithub, useGithubAccess, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';
import { GithubSignedOutNotice } from '@/features/sources/GithubSignedOutNotice';

const ALL_PULLS = '/pulls';

export function CodebaseHeader() {
  const pathname = usePathname();
  const reading = repoBeingRead(pathname);
  const pullNumber = pullBeingRead(pathname);
  return (
    <header className="flex items-center gap-2 border-b border-panel-edge bg-panel px-2 py-5">
      <Link href="/" aria-label="reposcope home" className="shrink-0">
        <ScopeMark size={20} title="reposcope home" />
      </Link>
      <CodebaseMenu reading={reading} />
      {reading &&
        (pullNumber === null ? <PullRequestMenu repo={reading} /> : <CurrentPullTitle repo={reading} number={pullNumber} />)}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <GithubSignedOutNotice />
        {reading && pullNumber !== null && <MergePullButton repo={reading} number={pullNumber} />}
        <ThemeToggle />
      </div>
    </header>
  );
}

function CodebaseMenu({ reading }: { reading: RepoRef | null }) {
  const pathname = usePathname();
  const readingAllPulls = pathname === ALL_PULLS;
  const ready = useStoreReady();
  const sources = useSources();
  const token = useGithubToken();
  const access = useGithubAccess();
  const results = useSourceResults(sources, token, ready, access);
  const connected = sources.some((source) => source.kind === 'viewer');

  return (
    <HeaderMenu
      label={readingAllPulls ? 'All pull requests' : reading ? <RepoLabel reading={reading} /> : 'Codebases'}
      width="w-80"
    >
      {() => (
        <>
          <MenuRow href={ALL_PULLS} active={readingAllPulls} label="All">
            open pull requests from every codebase, newest first
          </MenuRow>
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
                onClick={disconnectGithub}
                className="text-[10px] text-ink-dim hover:text-error-ink"
              >
                disconnect GitHub
              </button>
              {access === 'public' && <span className="ml-2 text-[10px] text-ink-dim">public repositories only</span>}
            </div>
          )}
        </>
      )}
    </HeaderMenu>
  );
}

function RepoLabel({ reading }: { reading: RepoRef }) {
  return (
    <>
      <span className="text-ink-dim/70">{reading.owner}/</span>
      {reading.name}
    </>
  );
}

function MenuRow({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <SelectableLink
      href={href}
      current={active}
      className={`flex items-baseline gap-1.5 border-b border-panel-edge px-2 py-1 text-[11px] leading-4 ${
        active ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
      }`}
    >
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[9px] text-ink-dim">{children}</span>
    </SelectableLink>
  );
}

function ReadingRow({ reading }: { reading: RepoRef }) {
  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      <h2 className="px-2 pt-1 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{reading.owner}</h2>
      <div className="flex items-baseline gap-1.5 bg-btn-active pr-2">
        <SelectableLink
          href={repoRoute(reading.owner, reading.name)}
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
