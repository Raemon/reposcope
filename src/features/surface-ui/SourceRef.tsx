'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { HoverCardTrigger } from './HoverCard';
import type { SourceLocation } from './sourceLocation';

export const RepoRefContext = createContext<{ owner: string; repo: string } | null>(null);

export function RepoRefProvider({ owner, repo, children }: { owner: string; repo: string; children: ReactNode }) {
  return <RepoRefContext.Provider value={{ owner, repo }}>{children}</RepoRefContext.Provider>;
}

export function githubBlobUrl(owner: string, repo: string, file: string, line?: number): string {
  return `https://github.com/${owner}/${repo}/blob/HEAD/${file}${line ? `#L${line}` : ''}`;
}

export function SourceRef({ at, showFile = true }: { at: SourceLocation; showFile?: boolean }) {
  const held = useContext(RepoRefContext);
  const label = showFile ? `${shortFile(at.file)}:${at.line}` : `:${at.line}`;
  const card = (
    <div>
      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-4 text-ink">{at.excerpt || '(empty line)'}</pre>
      {held ? <p className="mt-2 text-[10px] text-ink-dim">click to open on GitHub</p> : null}
    </div>
  );
  const anchor = held ? (
    <a
      href={githubBlobUrl(held.owner, held.repo, at.file, at.line)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[10px] text-ink-dim underline decoration-btn-edge underline-offset-2 hover:text-accent"
    >
      {label}
    </a>
  ) : (
    <span className="font-mono text-[10px] text-ink-dim">{label}</span>
  );
  return (
    <HoverCardTrigger label={`${at.file}:${at.line}`} card={card}>
      {anchor}
    </HoverCardTrigger>
  );
}

function shortFile(file: string): string {
  const segments = file.split('/');
  return segments.length <= 2 ? file : `…/${segments.slice(-2).join('/')}`;
}
