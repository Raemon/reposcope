'use client';

import type { ReactNode } from 'react';
import type { PreviewEntry } from './pullPreviews';
import { buildProgress, isCommitEntry, previewNeedsRebuild, type PreviewControls } from './usePullPreviews';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { StrokeIcon } from '@/features/surface-ui/StrokeIcon';

const ROW = 'flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] leading-4';
const HEADING_TEXT = 'text-[9px] uppercase tracking-[0.18em] text-ink-dim';
const HEADING = `px-2 pb-0.5 pt-1.5 ${HEADING_TEXT}`;
const NOTE = 'px-2 py-2 text-[11px] text-ink-dim';
const MONO = 'shrink-0 font-mono text-[10px] text-ink-dim';
const STATE_WORD: Record<PreviewEntry['state'], string | null> = { ready: null, building: 'building', failed: 'failed', none: 'no deploy' };
const DOT_TONE = {
  ready: 'bg-add-ink',
  building: 'bg-ink-dim animate-pulse',
  failed: 'bg-danger-ink',
  none: 'bg-ink-dim/40',
  behind: 'bg-warn-edge',
};

export function PreviewMenu({ previews, number, baseRef }: { previews: PreviewControls; number: number; baseRef: string }) {
  return (
    <PopoverMenu
      align="right-0"
      panelClass="flex max-h-[70vh] w-[28rem] flex-col overflow-hidden"
      trigger={(state) => <ChevronButton {...state} number={number} />}
    >
      {(close) => (
        <>
          <MenuHeader previews={previews} number={number} />
          <div className="min-h-0 flex-1 overflow-y-auto pb-0.5">
            <PreviewRows previews={previews} close={close} />
          </div>
          <BuildRow previews={previews} baseRef={baseRef} close={close} />
        </>
      )}
    </PopoverMenu>
  );
}

export function previewName(entry: PreviewEntry): string {
  return entry.branch ?? entry.sha.slice(0, 7);
}

function ChevronButton({ open, toggle, number }: PopoverTrigger & { number: number }) {
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`Show every preview deployment for #${number}`}
      onClick={toggle}
      className={`flex h-full items-center pl-0.5 pr-1.5 text-[9px] ${open ? 'bg-btn-active text-accent' : 'text-ink-dim/60 hover:text-ink'}`}
    >
      ▾
    </button>
  );
}

function MenuHeader({ previews, number }: { previews: PreviewControls; number: number }) {
  return (
    <div className={`flex items-baseline justify-between border-b border-panel-edge px-2 py-1.5 ${HEADING_TEXT}`}>
      <span>Preview deployments · #{number}</span>
      {previews.headSha !== null && <span className="font-mono normal-case tracking-normal">head {previews.headSha.slice(0, 7)}</span>}
    </div>
  );
}

function PreviewRows({ previews, close }: { previews: PreviewControls; close: () => void }) {
  if (!previews.loaded) return <p className={NOTE}>Loading previews…</p>;
  if (previews.entries.length === 0) return <p className={NOTE}>No commits yet.</p>;
  const branches = previews.entries.filter((entry) => !isCommitEntry(entry));
  const commits = previews.entries.filter(isCommitEntry);
  const grouped = branches.length > 0;
  return (
    <>
      <Section title={grouped ? 'Fresh preview branches' : null} entries={branches} previews={previews} close={close} />
      <Section title={grouped ? 'Commits' : null} entries={commits} previews={previews} close={close} />
    </>
  );
}

function Section({ title, entries, previews, close }: { title: string | null; entries: PreviewEntry[]; previews: PreviewControls; close: () => void }) {
  if (entries.length === 0) return null;
  return (
    <>
      {title !== null && <h3 className={HEADING}>{title}</h3>}
      {entries.map((entry) => <PreviewRow key={entry.branch ?? entry.sha} entry={entry} headSha={previews.headSha} close={close} />)}
    </>
  );
}

function PreviewRow({ entry, headSha, close }: { entry: PreviewEntry; headSha: string | null; close: () => void }) {
  const body = <RowBody entry={entry} latest={entry.forSha === headSha} />;
  if (entry.url === null) return <div className={`${ROW} text-ink-dim`}>{body}</div>;
  return (
    <a href={entry.url} target="_blank" rel="noreferrer" onClick={close} className={`${ROW} group text-ink hover:bg-btn-hover`}>
      {body}
    </a>
  );
}

function RowBody({ entry, latest }: { entry: PreviewEntry; latest: boolean }) {
  return (
    <>
      <StateDot state={entry.state} />
      <span className={`${MONO} ${isCommitEntry(entry) ? 'w-14' : 'max-w-52 truncate'}`}>{previewName(entry)}</span>
      <span className="min-w-0 flex-1 truncate">{entry.message}</span>
      {latest && <Tag tone="text-accent">latest</Tag>}
      <RowTrail entry={entry} />
      {entry.date !== '' && <RelativeTime iso={entry.date} className="w-7 shrink-0 justify-end text-[9px] text-ink-dim" />}
    </>
  );
}

function RowTrail({ entry }: { entry: PreviewEntry }) {
  const word = STATE_WORD[entry.state];
  if (word !== null) return <Tag tone="bg-btn text-ink-dim">{word}</Tag>;
  return (
    <span aria-hidden className="w-2 shrink-0 text-[10px] text-ink-dim/40 group-hover:text-ink">
      ↗
    </span>
  );
}

function Tag({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`shrink-0 rounded px-1 text-[9px] uppercase tracking-[0.14em] ${tone}`}>{children}</span>;
}

function BuildRow({ previews, baseRef, close }: { previews: PreviewControls; baseRef: string; close: () => void }) {
  const urging = previewNeedsRebuild(previews);
  return (
    <button
      type="button"
      disabled={previews.working}
      onClick={() => {
        close();
        previews.refresh();
      }}
      className={`${ROW} border-t border-panel-edge hover:bg-btn-hover disabled:opacity-40 disabled:hover:bg-transparent`}
    >
      <RefreshIcon spinning={previews.working} className={urging ? 'text-accent' : 'text-ink-dim'} />
      <span className={`shrink-0 ${urging ? 'text-accent' : 'text-ink'}`}>{buildTitle(previews)}</span>
      <span className="min-w-0 flex-1 truncate text-[10px] text-ink-dim">head with the latest {baseRef} merged in</span>
    </button>
  );
}

function buildTitle(previews: PreviewControls): string {
  return buildProgress(previews) ?? 'Build a fresh preview branch';
}

export function StateDot({ state }: { state: keyof typeof DOT_TONE }) {
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONE[state]}`} />;
}

export function RefreshIcon({ spinning, className = '' }: { spinning: boolean; className?: string }) {
  return (
    <StrokeIcon size={12} className={`shrink-0 ${spinning ? 'animate-spin' : ''} ${className}`}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </StrokeIcon>
  );
}
