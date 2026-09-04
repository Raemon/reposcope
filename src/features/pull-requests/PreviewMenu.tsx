'use client';

import type { PreviewEntry } from './pullPreviews';
import type { PreviewControls } from './usePullPreviews';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';

const ROW = 'flex w-full items-baseline gap-2 border-b border-panel-edge px-2 py-1 text-left text-[11px] leading-4 last:border-b-0';
const NOTE = 'px-2 py-1 text-[11px] text-ink-dim';
const STATE_WORD = { ready: '', building: 'building…', failed: 'failed', none: 'no deployment' };
const DOT_TONE = {
  ready: 'bg-add-ink',
  building: 'bg-ink-dim animate-pulse',
  failed: 'bg-danger-ink',
  none: 'bg-ink-dim/40',
  behind: 'bg-warn-edge',
};

export function PreviewMenu({ previews, number }: { previews: PreviewControls; number: number }) {
  return (
    <PopoverMenu align="right-0" panelClass="w-[26rem] max-h-[60vh] overflow-y-auto" trigger={(state) => <ChevronButton {...state} number={number} />}>
      {(close) => <PreviewRows previews={previews} close={close} />}
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
      className={`flex items-center px-1 text-[10px] hover:bg-btn-hover hover:text-ink ${open ? 'bg-btn-active text-accent' : ''}`}
    >
      ▾
    </button>
  );
}

function PreviewRows({ previews, close }: { previews: PreviewControls; close: () => void }) {
  if (!previews.loaded) return <p className={NOTE}>Loading previews…</p>;
  if (previews.entries.length === 0) return <p className={NOTE}>No commits yet.</p>;
  return previews.entries.map((entry) => <PreviewRow key={entry.sha} entry={entry} headSha={previews.headSha} close={close} />);
}

function PreviewRow({ entry, headSha, close }: { entry: PreviewEntry; headSha: string | null; close: () => void }) {
  const body = <RowBody entry={entry} latest={entry.forSha === headSha} />;
  if (entry.url === null) return <div className={`${ROW} text-ink-dim`}>{body}</div>;
  return (
    <a href={entry.url} target="_blank" rel="noreferrer" onClick={close} className={`${ROW} text-ink hover:bg-btn-hover`}>
      {body}
    </a>
  );
}

function RowBody({ entry, latest }: { entry: PreviewEntry; latest: boolean }) {
  return (
    <>
      <StateDot state={entry.state} />
      <span className="shrink-0 font-mono text-[10px] text-ink-dim">{previewName(entry)}</span>
      <span className="min-w-0 flex-1 truncate">{entry.message}</span>
      {latest && <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-accent">latest</span>}
      <span className="shrink-0 text-[9px] text-ink-dim">{STATE_WORD[entry.state]}</span>
      {entry.date !== '' && <RelativeTime iso={entry.date} className="shrink-0 text-[9px] text-ink-dim" />}
    </>
  );
}

export function StateDot({ state }: { state: keyof typeof DOT_TONE }) {
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 self-center rounded-full ${DOT_TONE[state]}`} />;
}
