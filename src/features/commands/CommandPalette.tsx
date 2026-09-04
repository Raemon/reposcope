'use client';

import { usePathname } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRegisteredCommands, type Command } from './commandRegistry';
import { formatBinding } from './keyChords';
import { rankPaletteItems, type PaletteHit, type PaletteItem, type PaletteScope } from './paletteItems';
import { KIND_LABEL, KIND_PREFIX, PALETTE_KINDS, parsePaletteQuery, type PaletteKind } from './paletteQuery';
import { closePalette, usePaletteState } from './paletteStore';
import { useIsMac } from './platform';
import { usePaletteObjects } from './usePaletteObjects';

const BROWSE_CAPS: Partial<Record<PaletteKind, number>> = { repo: 8, pull: 12, file: 8, commit: 6, branch: 6 };
const ROW = 'flex w-full items-baseline gap-2 px-3 py-1 text-left text-[11px] leading-4';
const CHIP = 'shrink-0 rounded bg-btn-active px-1.5 py-[1px] text-[10px] text-accent';
const KIND_TAG: Record<PaletteKind, string> = { command: 'cmd', repo: 'repo', pull: 'pull', file: 'file', commit: 'commit', branch: 'branch' };

type PaletteAction = 'down' | 'up' | 'run' | 'narrow' | 'back' | 'close';

export function CommandPalette() {
  const state = usePaletteState();
  if (!state.open) return null;
  // The epoch remounts the dialog so each open starts from its seed.
  return <PaletteDialog key={state.epoch} seed={state.seed} />;
}

function PaletteDialog({ seed }: { seed: string }) {
  const pathname = usePathname();
  const [text, setText] = useState(seed);
  const [scope, setScope] = useState<PaletteScope | null>(null);
  const [cursor, setCursor] = useState(0);
  const hits = usePaletteHits(text, scope, pathname);
  const current = hits[Math.min(cursor, hits.length - 1)] ?? null;
  const query = parsePaletteQuery(text);
  const act = usePaletteActions({ current, count: hits.length, scope, setScope, setText, setCursor });
  useCloseOnNavigation(pathname);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={closePalette}>
      <div
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded bg-panel text-ink shadow-card"
      >
        <div className="flex items-center gap-2 border-b border-panel-edge px-3 py-2">
          {scope && <ScopeChip scope={scope} onClear={() => setScope(null)} />}
          {query.kind && <span className={CHIP}>{KIND_LABEL[query.kind]}</span>}
          <input
            autoFocus
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              const action = paletteActionFor(event);
              if (action === null) return;
              event.preventDefault();
              act(action);
            }}
            placeholder={scope ? `search in ${scopeLabel(scope)}` : 'search files, pull requests, repositories, commits, or commands'}
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-ink-dim"
          />
        </div>
        <HitList hits={hits} cursor={current} onHover={setCursor} onRun={(hit) => runHit(hit)} />
        <Legend />
      </div>
    </div>
  );
}

function usePaletteHits(text: string, scope: PaletteScope | null, pathname: string): PaletteHit[] {
  const deferred = useDeferredValue(text);
  const query = parsePaletteQuery(deferred);
  const commands = useRegisteredCommands();
  const objects = usePaletteObjects(scope, pathname, query.kind === 'file' || (query.kind === null && query.text !== ''));
  const items = useMemo(() => [...commandItems(commands), ...objects], [commands, objects]);
  return useMemo(() => rankPaletteItems(deferred, items, BROWSE_CAPS), [deferred, items]);
}

function commandItems(commands: Command[]): PaletteItem[] {
  return commands.map((held) => ({ key: `command:${held.id}`, kind: 'command', title: held.title, detail: held.group, keys: held.keys, run: held.run }));
}

function usePaletteActions({
  current,
  count,
  scope,
  setScope,
  setText,
  setCursor,
}: {
  current: PaletteHit | null;
  count: number;
  scope: PaletteScope | null;
  setScope: (scope: PaletteScope | null) => void;
  setText: (text: string) => void;
  setCursor: (update: (held: number) => number) => void;
}): (action: PaletteAction) => void {
  const narrow = () => {
    if (!current?.item.scope) return;
    setScope(current.item.scope);
    setText('');
    setCursor(() => 0);
  };
  const actions: Record<PaletteAction, () => void> = {
    down: () => setCursor((held) => wrap(held + 1, count)),
    up: () => setCursor((held) => wrap(held - 1, count)),
    run: () => runHit(current),
    narrow,
    back: () => (scope === null ? undefined : setScope(null)),
    close: closePalette,
  };
  return (action) => actions[action]();
}

function runHit(hit: PaletteHit | null): void {
  if (!hit) return;
  closePalette();
  hit.item.run();
}

function paletteActionFor(event: ReactKeyboardEvent<HTMLInputElement>): PaletteAction | null {
  const ctrl = event.ctrlKey && !event.metaKey;
  if (event.key === 'ArrowDown' || (ctrl && event.key === 'n')) return 'down';
  if (event.key === 'ArrowUp' || (ctrl && event.key === 'p')) return 'up';
  if (event.key === 'Enter') return 'run';
  if (event.key === 'Tab' && !event.shiftKey) return 'narrow';
  if (event.key === 'Escape') return 'close';
  if (event.key === 'Backspace' && event.currentTarget.value === '') return 'back';
  return null;
}

function wrap(index: number, length: number): number {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function useCloseOnNavigation(pathname: string): void {
  const opened = useRef(pathname);
  useEffect(() => {
    if (pathname !== opened.current) closePalette();
  }, [pathname]);
}

function scopeLabel(scope: PaletteScope): string {
  if (scope.kind === 'repo') return `${scope.owner}/${scope.name}`;
  if (scope.kind === 'pull') return `${scope.owner}/${scope.repo}#${scope.number}`;
  return `${scope.owner}/${scope.repo} @ ${scope.name}`;
}

function ScopeChip({ scope, onClear }: { scope: PaletteScope; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} aria-label={`Leave ${scopeLabel(scope)}`} className={`${CHIP} hover:bg-btn-both`}>
      {scopeLabel(scope)} ×
    </button>
  );
}

function HitList({
  hits,
  cursor,
  onHover,
  onRun,
}: {
  hits: PaletteHit[];
  cursor: PaletteHit | null;
  onHover: (index: number) => void;
  onRun: (hit: PaletteHit) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);
  if (hits.length === 0) return <p className="px-3 py-2 text-[11px] text-ink-dim">Nothing matches.</p>;
  return (
    <div ref={list} role="listbox" className="min-h-0 flex-1 overflow-auto py-1">
      {hits.map((hit, index) => (
        <HitRow key={hit.item.key} hit={hit} active={hit === cursor} onHover={() => onHover(index)} onRun={() => onRun(hit)} />
      ))}
    </div>
  );
}

function HitRow({ hit, active, onHover, onRun }: { hit: PaletteHit; active: boolean; onHover: () => void; onRun: () => void }) {
  const mac = useIsMac();
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onPointerEnter={onHover}
      onClick={onRun}
      className={`${ROW} ${active ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
    >
      <span className="w-14 shrink-0 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{KIND_TAG[hit.item.kind]}</span>
      <span className="min-w-0 flex-1 truncate">
        <Highlighted text={hit.item.title} positions={hit.titlePositions} />
        {hit.item.detail && (
          <span className="ml-2 text-[10px] text-ink-dim">
            <Highlighted text={hit.item.detail} positions={hit.detailPositions} />
          </span>
        )}
      </span>
      {hit.item.scope && active && <span className="shrink-0 text-[9px] text-ink-dim">⇥ narrow</span>}
      {hit.item.keys && hit.item.keys.length > 0 && (
        <span className="shrink-0 font-mono text-[10px] text-ink-dim">{hit.item.keys.map((keys) => formatBinding(keys, mac)).join('  ')}</span>
      )}
    </button>
  );
}

function Highlighted({ text, positions }: { text: string; positions: number[] }) {
  if (positions.length === 0) return text;
  const marked = new Set(positions);
  return [...text].map((char, at) =>
    marked.has(at) ? (
      <span key={at} className="font-bold text-accent">
        {char}
      </span>
    ) : (
      char
    ),
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-panel-edge px-3 py-1.5 text-[9px] text-ink-dim">
      {PALETTE_KINDS.map((kind) => (
        <span key={kind}>
          <span className="font-mono text-ink">{KIND_PREFIX[kind]}</span> {KIND_LABEL[kind]}
        </span>
      ))}
      <span className="ml-auto">↑↓ move · ↩ open · ⇥ narrow · ⌫ back · esc close</span>
    </div>
  );
}
