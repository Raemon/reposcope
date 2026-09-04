'use client';

import { useEffect, useMemo, useRef, type CSSProperties, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { codeSegments } from './codeSegments';
import type { PeekView } from './definitionContext';
import {
  useDefinitionPeekActions,
  useDefinitionPeekShown,
  type PeekFrame,
  type PeekOrigin,
  type PeekSession,
} from './definitionPeekStore';
import type { DefinitionSite } from './definitionResolver';
import { unifiedLines, type DiffLine } from './diffLines';
import { lineTone } from './DiffSide';
import { originAtPress } from './useDefinitionClick';
import { useDiffTokens } from './useDiffSideHighlight';

export function DefinitionPeek() {
  const shown = useDefinitionPeekShown();
  if (!shown?.session) return null;
  return createPortal(<PeekPanel session={shown.session} />, document.body);
}

function PeekPanel({ session }: { session: PeekSession }) {
  const actions = useDefinitionPeekActions();
  const panel = useRef<HTMLDivElement | null>(null);
  const frame = session.frames[session.frames.length - 1];
  useDismiss(panel, actions?.close);
  if (!actions || !frame) return null;
  return (
    <div
      ref={panel}
      className="fixed z-50 flex w-[680px] max-w-[92vw] flex-col overflow-hidden rounded border border-panel-edge bg-panel shadow-card"
      style={panelPlacement(session.anchor)}
    >
      <PeekHeader frame={frame} depth={session.frames.length} onBack={actions.back} onClose={actions.close} />
      {frame.sites.length > 1 && <CandidateRow frame={frame} onPick={(site) => actions.pick(site, frame)} />}
      <PeekBody frame={frame} onPush={actions.push} />
    </div>
  );
}

function useDismiss(panel: React.RefObject<HTMLDivElement | null>, close: (() => void) | undefined) {
  useEffect(() => {
    if (!close) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    const outside = (event: Event) => panel.current !== null && !panel.current.contains(event.target as Node);
    const onPress = (event: PointerEvent) => outside(event) && close();
    const onScroll = (event: Event) => outside(event) && close();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPress);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [panel, close]);
}

function panelPlacement(anchor: { x: number; y: number }): CSSProperties {
  const width = Math.min(680, window.innerWidth * 0.92);
  const left = Math.min(Math.max(8, anchor.x - 80), window.innerWidth - width - 8);
  const below = window.innerHeight - anchor.y;
  if (below > 280) return { left, top: anchor.y + 12, maxHeight: Math.min(420, below - 24) };
  return { left, bottom: below + 12, maxHeight: Math.min(420, anchor.y - 24) };
}

function PeekHeader({
  frame,
  depth,
  onBack,
  onClose,
}: {
  frame: PeekFrame;
  depth: number;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-panel-edge px-2 py-1 text-[11px] text-ink">
      {depth > 1 && <HeaderButton label="Back" onClick={onBack} text="‹" />}
      <span className="filename-text min-w-0 flex-1 truncate">
        <span className="text-ink-dim">{frame.word} · </span>
        {frame.site ? `${frame.site.path}:${frame.site.nameLine}` : '…'}
      </span>
      {frame.view?.changedInPull && (
        <span className="shrink-0 rounded bg-add-bg px-1 text-[9px] uppercase tracking-[0.14em] text-add-ink">changed here</span>
      )}
      <HeaderButton label="Close definition peek" onClick={onClose} text="×" />
    </header>
  );
}

function HeaderButton({ label, onClick, text }: { label: string; onClick: () => void; text: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="shrink-0 rounded px-1 text-ink-dim hover:bg-btn-hover hover:text-ink">
      {text}
    </button>
  );
}

function CandidateRow({ frame, onPick }: { frame: PeekFrame; onPick: (site: DefinitionSite) => void }) {
  return (
    <div className="flex shrink-0 flex-wrap gap-1 border-b border-panel-edge px-2 py-1 text-[9px]">
      {frame.sites.map((site) => (
        <button
          key={`${site.ref}:${site.path}:${site.nameLine}`}
          type="button"
          onClick={() => onPick(site)}
          className={`rounded px-1 ${sameSite(site, frame.site) ? 'bg-btn-hover text-ink' : 'text-ink-dim hover:bg-btn-hover hover:text-ink'}`}
        >
          {site.path}:{site.nameLine}
        </button>
      ))}
    </div>
  );
}

function sameSite(a: DefinitionSite, b: DefinitionSite | null): boolean {
  return b !== null && a.path === b.path && a.nameLine === b.nameLine && a.ref === b.ref;
}

function PeekBody({ frame, onPush }: { frame: PeekFrame; onPush: (origin: PeekOrigin) => void }) {
  if (frame.loading) return <PeekNote text={`resolving ${frame.word}…`} />;
  if (!frame.view) return <PeekNote text={frame.note ?? 'no definition found'} />;
  return <PeekCode view={frame.view} path={frame.site?.path ?? ''} onPush={onPush} />;
}

function PeekNote({ text }: { text: string }) {
  return <p className="px-2 py-2 font-sans text-[11px] text-ink-dim">{text}</p>;
}

function PeekCode({ view, path, onPush }: { view: PeekView; path: string; onPush: (origin: PeekOrigin) => void }) {
  const tokens = useDiffTokens(view.rows, path);
  const lines = useMemo(() => unifiedLines(view.rows), [view.rows]);
  return (
    <div className="min-h-0 overflow-auto bg-code py-1">
      {lines.map((line, at) => (
        <PeekLine
          key={at}
          line={line}
          tokens={line.cell ? tokens?.[line.side][line.row] ?? null : null}
          onPress={(event) => {
            if (event.detail !== 1) return;
            const origin = originAtPress(view.sides, line, event);
            if (origin) onPush(origin);
          }}
        />
      ))}
      {view.truncated && <p className="px-2 font-sans text-[9px] italic text-ink-dim">… truncated</p>}
    </div>
  );
}

function PeekLine({
  line,
  tokens,
  onPress,
}: {
  line: DiffLine;
  tokens: Parameters<typeof codeSegments>[1];
  onPress: (event: MouseEvent<HTMLElement>) => void;
}) {
  const cell = line.cell;
  if (line.kind === 'hunk' || !cell) return null;
  return (
    <div className={`flex h-[15px] items-center gap-1 leading-[15px] ${lineTone(line.side, line.kind === 'change')}`}>
      <span className="w-[38px] shrink-0 select-none text-right text-[9px] text-ink-dim">{cell.line}</span>
      <span className="diff-code whitespace-pre pr-2 text-[11px]" onClick={onPress}>
        {codeSegments(cell.text, tokens, null).map((segment, at) => (
          <span key={at} style={segment.style}>
            {segment.content}
          </span>
        ))}
      </span>
    </div>
  );
}
