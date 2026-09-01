'use client';

import { Fragment, type ReactNode } from 'react';
import { hunkHasEditableLines, type EditableBlock } from './editableBlocks';
import { codeSegments } from './codeSegments';
import { collapsedPreview } from './collapsedPreview';
import { diffEditModeOn } from './editModeStore';
import type { DiffLine } from './diffLines';
import type { ThemedToken } from './diffHighlight';
import type { CharRange, IntralineRanges } from './intralineDiff';
import type { DiffRow } from './splitDiff';
import type { CollapseAnchor } from './useCodeCollapse';
import type { CodePress } from './useDefinitionClick';
import type { SideTokens } from './useDiffSideHighlight';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
// Literal px; Tailwind can't compile computed classes. Sync with BLANK_ROW_HEIGHT.
const BLANK_ROW = 'flex h-[4px] items-center gap-1 leading-[4px]';
const GUTTER = 'flex w-[46px] shrink-0 select-none items-center text-[9px] text-ink-dim';
const TOUCHED_MARK = 'bg-add-bg/60 shadow-[inset_2px_0_0_var(--add-emph)]';
const STICKY_CHIP = 'sticky right-0 shrink-0 rounded bg-procgen px-1 hover:bg-btn-hover hover:text-ink';
const EDIT_BTN = `${STICKY_CHIP} uppercase tracking-[0.14em]`;
const FOLD_BADGE = `${STICKY_CHIP} ml-1 text-[9px] italic text-ink-dim`;
const FOLD_PREVIEW = 'diff-code max-w-[90ch] shrink overflow-hidden text-ellipsis whitespace-pre pl-2 text-[11px] text-ink-dim/70';

export interface HunkControl {
  expanded: boolean;
  hint: string;
  onToggle: (() => void) | null;
}

export interface SideProps {
  rows: DiffRow[];
  lines: DiffLine[];
  labels: boolean;
  tokens: SideTokens | null;
  emphasis: (IntralineRanges | null)[];
  expand: HunkControl;
  anchors: Map<number, CollapseAnchor>;
  editable?: boolean;
  onEditBlock?: (rowIndex: number) => void;
  editor?: ReactNode;
  editedRows?: EditableBlock | null;
  spacer?: { afterRow: number; height: number } | null;
  onCodePress?: CodePress;
}

export function DiffSide(props: SideProps) {
  const { lines, editedRows, editor } = props;
  if (!editedRows) return <DiffLines {...props} from={0} to={lines.length} />;
  const edited = editedLineRange(lines, editedRows);
  return (
    <div className="min-w-0 flex-1">
      <DiffLines {...props} from={0} to={edited.first} />
      {editor}
      <DiffLines {...props} from={edited.last + 1} to={lines.length} />
    </div>
  );
}

function editedLineRange(lines: DiffLine[], block: EditableBlock): { first: number; last: number } {
  const covered = lines.flatMap((line, index) => (line.row >= block.firstRow && line.row <= block.lastRow ? [index] : []));
  return { first: covered[0] ?? lines.length, last: covered[covered.length - 1] ?? lines.length - 1 };
}

function DiffLines({
  rows,
  lines,
  from,
  to,
  labels,
  tokens,
  emphasis,
  expand,
  anchors,
  editable,
  onEditBlock,
  spacer,
  onCodePress,
}: SideProps & { from: number; to: number }) {
  if (from >= to) return null;
  const spacerLine = spacer ? lastLineOfRow(lines, spacer.afterRow) : -1;
  const rowsWithRightLine = rowsShownOnRight(lines);
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <div className="w-max min-w-full">
        {lines.slice(from, to).map((line, offset) => {
          const index = from + offset;
          const anchor = anchorOf(line, anchors, rowsWithRightLine);
          return (
            <Fragment key={index}>
              <DiffLineView
                line={line}
                labels={labels}
                preview={previewFor(rows, line, anchor)}
                lineTokens={tokens?.[line.side][line.row] ?? null}
                ranges={rangesFor(emphasis[line.row], line.side)}
                expand={expand}
                anchor={anchor}
                editable={editable}
                onEdit={editStarter(rows, line.row, onEditBlock)}
                onCodePress={onCodePress}
              />
              {spacerLine === index && <div style={{ height: spacer?.height }} />}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function lastLineOfRow(lines: DiffLine[], row: number): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) if (lines[index]?.row === row) return index;
  return -1;
}

function rangesFor(emphasis: IntralineRanges | null | undefined, side: 'left' | 'right'): CharRange[] | null {
  return (side === 'left' ? emphasis?.before : emphasis?.after) ?? null;
}

function rowsShownOnRight(lines: DiffLine[]): Set<number> {
  return new Set(lines.filter((line) => line.side === 'right').map((line) => line.row));
}

function previewFor(rows: DiffRow[], line: DiffLine, anchor: CollapseAnchor | null): string {
  return anchor?.collapsed ? collapsedPreview(rows, anchor.region, line.side) : '';
}

function anchorOf(line: DiffLine, anchors: Map<number, CollapseAnchor>, rowsWithRightLine: Set<number>): CollapseAnchor | null {
  if (line.side === 'left' && rowsWithRightLine.has(line.row)) return null;
  return anchors.get(line.row) ?? null;
}

function editStarter(rows: DiffRow[], index: number, onEditBlock?: (rowIndex: number) => void) {
  if (!onEditBlock) return undefined;
  const hunk = rows[index]?.kind === 'hunk';
  if (hunk && !hunkHasEditableLines(rows, index)) return undefined;
  return () => onEditBlock(index + (hunk ? 1 : 0));
}

function DiffLineView({
  line,
  labels,
  lineTokens,
  ranges,
  expand,
  anchor,
  preview,
  editable,
  onEdit,
  onCodePress,
}: {
  line: DiffLine;
  labels: boolean;
  preview: string;
  lineTokens: ThemedToken[] | null;
  ranges: CharRange[] | null;
  expand: HunkControl;
  anchor: CollapseAnchor | null;
  editable?: boolean;
  onEdit?: () => void;
  onCodePress?: CodePress;
}) {
  const { cell, side } = line;
  if (line.kind === 'hunk') {
    return <HunkLine label={labels ? line.label : ''} expand={expand} onEdit={editable && side === 'right' ? onEdit : undefined} />;
  }
  const row = line.blank ? BLANK_ROW : ROW;
  if (!cell) return <div className={`${row} bg-procgen/40`} />;
  const changed = line.kind === 'change';
  const openable = Boolean(editable && side === 'right');
  return (
    <div
      className={`group ${row} ${lineTone(side, changed, line.touched)} ${openable ? 'cursor-text' : ''}`}
      onClick={openable && onEdit ? (event) => opensEditor(event.detail) && onEdit() : undefined}
    >
      <GutterCell line={line.blank ? null : cell.line} anchor={anchor} />
      <span
        className="diff-code whitespace-pre pr-2 text-[11px]"
        onClick={onCodePress ? (event) => onCodePress(line, event) : undefined}
      >
        {codeSegments(cell.text, lineTokens, changed ? ranges : null).map((segment, index) => (
          <span
            key={index}
            className={segment.emphasized ? emphasisTone(side) : undefined}
            style={segment.style}
          >
            {segment.content}
          </span>
        ))}
      </span>
      {preview && <span className={FOLD_PREVIEW}>{preview}</span>}
      {anchor?.collapsed && <FoldBadge anchor={anchor} />}
    </div>
  );
}

function opensEditor(clickCount: number): boolean {
  return clickCount >= 3 || (diffEditModeOn() && !window.getSelection()?.toString());
}

function FoldBadge({ anchor }: { anchor: CollapseAnchor }) {
  const { addedLines, deletedLines, kind } = anchor.region;
  return (
    <button type="button" onClick={anchor.toggle} title={kind.replace(/_/g, ' ')} className={FOLD_BADGE}>
      {foldLabel(anchor)}
      {addedLines > 0 && <span className="not-italic text-add-ink"> +{addedLines}</span>}
      {deletedLines > 0 && <span className="not-italic text-del-ink"> −{deletedLines}</span>}
    </button>
  );
}

function foldLabel(anchor: CollapseAnchor): string {
  const folded = `⋯ ${plural(anchor.region.end - anchor.region.start, 'line')}`;
  return anchor.hiddenThreads === 0 ? folded : `${folded} · ${plural(anchor.hiddenThreads, 'thread')}`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function GutterCell({ line, anchor }: { line: number | null; anchor: CollapseAnchor | null }) {
  return (
    <span className={GUTTER}>
      <span className="min-w-0 flex-1 text-right">{line}</span>
      <span className="w-3 shrink-0 text-center">{anchor && <CollapseChevron anchor={anchor} />}</span>
    </span>
  );
}

function CollapseChevron({ anchor }: { anchor: CollapseAnchor }) {
  return (
    <button
      type="button"
      onClick={anchor.toggle}
      aria-label={anchor.collapsed ? 'Expand code block' : 'Collapse code block'}
      className={`shrink-0 text-[11px] leading-[15px] text-ink-dim hover:text-ink ${
        anchor.collapsed ? '' : 'opacity-40 group-hover:opacity-100'
      }`}
    >
      {anchor.collapsed ? '▸' : '▾'}
    </button>
  );
}

export function lineTone(side: 'left' | 'right', changed: boolean, touched: boolean): string {
  if (changed) return side === 'left' ? 'bg-del-bg text-del-ink' : 'bg-add-bg text-add-ink';
  return touched ? TOUCHED_MARK : '';
}

function emphasisTone(side: 'left' | 'right'): string {
  return side === 'left' ? 'bg-del-emph' : 'bg-add-emph';
}

function HunkLine({ label, expand, onEdit }: { label: string; expand: HunkControl; onEdit?: () => void }) {
  const edit = onEdit ? (
    <HoverCardTrigger label="Edit this hunk and commit the change" focusable={false} tooltipStyle>
      <button type="button" onClick={onEdit} className={EDIT_BTN}>
        edit
      </button>
    </HoverCardTrigger>
  ) : null;
  const body = (
    <>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {expand.hint && (
        <span className="flex shrink-0 items-center gap-1 text-ink-dim/80">
          <span aria-hidden className="text-[11px]">{expand.expanded ? '▾' : '▸'}</span>
          {expand.hint}
        </span>
      )}
    </>
  );
  const line = `${ROW} w-full bg-procgen px-1 text-left text-[9px] text-ink-dim`;
  if (!expand.onToggle) {
    return (
      <div className={line}>
        {body}
        {edit}
      </div>
    );
  }
  return (
    <div className={`${ROW} w-full bg-procgen text-[9px] text-ink-dim`}>
      <SelectableRow onActivate={expand.onToggle} expanded={expand.expanded} className={`${ROW} min-w-0 flex-1 bg-procgen px-1 text-left text-[9px] text-ink-dim hover:bg-btn-hover`}>
        {body}
      </SelectableRow>
      {edit}
    </div>
  );
}
