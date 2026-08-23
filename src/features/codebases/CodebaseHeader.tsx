'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CodebaseList } from './CodebaseList';
import { sidebarGroups } from './sidebarGroups';
import { useSourceResults } from './useSourceResults';
import { parseRepoLink, type RepoRef } from '@/features/sources/parseRepoLink';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { clearGithubToken, removeSource, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';

export function CodebaseHeader() {
  const pathname = usePathname();
  const reading = repoBeingRead(pathname);
  return (
    <header className="flex items-center gap-3 border-b border-panel-edge bg-panel px-3 py-2">
      <CodebaseMenu reading={reading} />
      <Link href="/" className="text-sm text-accent">
        reposcope
      </Link>
      {reading && (
        <span className="min-w-0 truncate text-[11px] text-ink-dim">
          {reading.owner}/{reading.name}
        </span>
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={menu} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((held) => !held)}
        className={`rounded border border-btn-edge px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
          open ? 'bg-btn-active text-accent' : 'text-ink-dim hover:bg-btn-hover hover:text-ink'
        }`}
      >
        Codebases ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded border border-panel-edge bg-panel shadow-lg">
          {!ready ? (
            <p className="px-3 py-3 text-[11px] leading-4 text-ink-dim">Loading…</p>
          ) : sources.length === 0 ? (
            reading ? (
              <ReadingRow reading={reading} />
            ) : (
              <p className="px-3 py-3 text-[11px] leading-4 text-ink-dim">
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
            <div className="border-t border-panel-edge px-3 py-2">
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
        </div>
      )}
    </div>
  );
}

function ReadingRow({ reading }: { reading: RepoRef }) {
  return (
    <nav className="min-h-0 flex-1 overflow-auto py-1">
      <h2 className="px-3 pb-1 pt-2 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{reading.owner}</h2>
      <div className="flex items-baseline gap-1.5 bg-btn-active pr-2">
        <Link
          href={`/repo/${reading.owner}/${reading.name}`}
          aria-current="page"
          className="flex min-w-0 flex-1 items-baseline justify-between gap-2 py-[3px] pl-3 text-[11px] leading-4 text-accent"
        >
          <span className="truncate">{reading.name}</span>
          <span className="shrink-0 text-[9px] text-ink-dim">reading</span>
        </Link>
      </div>
    </nav>
  );
}

function repoBeingRead(pathname: string): RepoRef | null {
  const segments = pathname.match(/^\/repo\/([^/]+)\/([^/]+)\/?$/);
  if (!segments?.[1] || !segments[2]) return null;
  try {
    const parsed = parseRepoLink(`${decodeURIComponent(segments[1])}/${decodeURIComponent(segments[2])}`);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}
