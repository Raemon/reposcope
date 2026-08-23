'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CodebaseList } from './CodebaseList';
import { HeaderMenu } from './HeaderMenu';
import { sidebarGroups } from './sidebarGroups';
import { useSourceResults } from './useSourceResults';
import { PullRequestMenu } from '@/features/pull-requests/PullRequestMenu';
import { parseRepoLink, type RepoRef } from '@/features/sources/parseRepoLink';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { clearGithubToken, removeSource, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';

export function CodebaseHeader() {
  const pathname = usePathname();
  const reading = repoBeingRead(pathname);
  return (
    <header className="flex items-center gap-2 border-b border-panel-edge bg-panel px-2 py-1">
      <CodebaseMenu reading={reading} />
      {reading && <PullRequestMenu repo={reading} />}
      <Link href="/" className="text-sm text-accent">
        reposcope
      </Link>
      {reading && (
        <Link href={`/repo/${reading.owner}/${reading.name}`} className="min-w-0 truncate text-[11px] text-ink-dim">
          {reading.owner}/{reading.name}
        </Link>
      )}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

function CodebaseMenu({ reading }: { reading: RepoRef | null }) {
  const ready = useStoreReady();
  const sources = useSources();
  const token = useGithubToken();
  const results = useSourceResults(sources, token, ready);
  const connected = sources.some((source) => source.kind === 'viewer');

  return (
    <HeaderMenu label="Codebases" width="w-80">
      {() => (
        <>
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

function ReadingRow({ reading }: { reading: RepoRef }) {
  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      <h2 className="px-2 pt-1 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{reading.owner}</h2>
      <div className="flex items-baseline gap-1.5 bg-btn-active pr-2">
        <Link
          href={`/repo/${reading.owner}/${reading.name}`}
          aria-current="page"
          className="flex min-w-0 flex-1 items-baseline justify-between gap-2 py-[1px] pl-2 text-[11px] leading-4 text-accent"
        >
          <span className="truncate">{reading.name}</span>
          <span className="shrink-0 text-[9px] text-ink-dim">reading</span>
        </Link>
      </div>
    </nav>
  );
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
