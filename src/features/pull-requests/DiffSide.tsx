'use client';

import { Fragment, useLayoutEffect, useRef, type ReactNode } from 'react';
import { hunkHasEditableLines, type EditableBlock } from './editableBlocks';
import { codeSegments } from './codeSegments';
import { dimAroundName } from './foldDimming';
import { collapsedPreview } from './collapsedPreview';
import { diffEditModeOn } from './editModeStore';
import { foldsCollapsed, useFoldCommand } from './foldModeStore';
import type { DiffLine } from './diffLines';
import type { ThemedToken } from './diffHighlight';
import type { CharRange, IntralineRanges } from './intralineDiff';
import type { DiffRow } from './splitDiff';
import type { CollapseAnchor } from './useCodeCollapse';
import type { CodePress } from './useDefinitionClick';
import type { SideTokens } from './useDiffSideHighlight';
import { lineHeight, type RowHeights } from './diffMetrics';
import { hangingIndent, measureRowHeights, sameRowHeights, WRAPPED_CELL } from './rowHeights';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
const WRAPPED_ROW = 'flex min-h-[15px] items-start gap-1 leading-[15px]';
// Literal px; Tailwind can't compile computed classes. Sync with BLANK_ROW_HEIGHT.
const BLANK_ROW = 'flex h-[4px] items-center gap-1 leading-[4px]';
const GUTTER = 'flex w-[46px] shrink-0 select-none items-center text-[9px] text-ink-dim';
const TOUCHED_MARK = 'bg-add-bg/60 shadow-[inset_2px_0_0_var(--add-emph)]';
const STICKY_CHIP = 'sticky right-0 shrink-0 rounded bg-procgen px-1 hover:bg-btn-hover hover:text-ink';
const EDIT_BTN = `${STICKY_CHIP} uppercase tracking-[0.14em]`;
const FOLD_BADGE = `${STICKY_CHIP} ml-1 text-[9px] italic text-ink-dim`;
const FOLD_PREVIEW = 'diff-code max-w-[90ch] shrink-[999] overflow-hidden text-ellipsis whitespace-pre pl-2 text-[11px] text-ink-dim/70';
const CODE = 'diff-code whitespace-pre pr-2 text-[11px]';
// break-word, so only a word too long for a whole line is ever split.
const WRAPPED_CODE = 'diff-code min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:break-word] [tab-size:8] pr-2 text-[11px]';
// 150px keeps the fold badge clear of the ellipsis; 100cqw is the visible column width.
const FOLDED_TEXT = 'flex min-w-0 max-w-[calc(100cqw-150px)] overflow-hidden';

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
  wrap: boolean;
  heights: RowHeights;
  onMeasured: (heights: RowHeights) => void;
}

export function DiffSide(props: SideProps) {
  const pane = useRef<HTMLDivElement | null>(null);
  useMeasuredRows(pane, props.wrap, props.onMeasured);
  return (
    <div ref={pane} className="min-w-0 flex-1">
      <PaneLines {...props} />
    </div>
  );
}

function PaneLines(props: SideProps) {
  const { lines, editedRows, editor } = props;
  if (!editedRows) return <DiffLines {...props} from={0} to={lines.length} />;
  const edited = editedLineRange(lines, editedRows);
  return (
    <>
      <DiffLines {...props} from={0} to={edited.first} />
      {editor}
      <DiffLines {...props} from={edited.last + 1} to={lines.length} />
    </>
  );
}

/** No dep array: every render can rewrap, and a resize does so without one. */
function useMeasuredRows(pane: React.RefObject<HTMLElement | null>, wrapping: boolean, onMeasured: (heights: RowHeights) => void) {
  const held = useRef<RowHeights>(null);
  const report = (next: RowHeights) => {
    if (sameRowHeights(held.current, next)) return;
    held.current = next;
    onMeasured(next);
  };
  const latest = useRef(report);
  latest.current = report;
  useLayoutEffect(() => {
    const element = pane.current;
    if (!element || !wrapping) return latest.current(null);
    const measure = () => latest.current(measureRowHeights(element));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  });
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
  wrap,
  heights,
}: SideProps & { from: number; to: number }) {
  const dim = foldsCollapsed(useFoldCommand().mode);
  if (from >= to) return null;
  const spacerLine = spacer ? lastLineOfRow(lines, spacer.afterRow) : -1;
  const rowsWithRightLine = rowsShownOnRight(lines);
  return (
    <div className={`@container min-w-0 flex-1 ${wrap ? '' : 'overflow-x-auto'}`}>
      <div className={wrap ? 'w-full' : 'w-max min-w-full'}>
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
                collapsed={anchors.get(line.row)?.collapsed ?? false}
                dim={dim}
                wrap={wrap}
                height={heights ? lineHeight(line, heights) : null}
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
  collapsed,
  preview,
  dim,
  wrap,
  height,
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
  collapsed: boolean;
  dim: boolean;
  wrap: boolean;
  height: number | null;
  editable?: boolean;
  onEdit?: () => void;
  onCodePress?: CodePress;
}) {
  const { cell, side } = line;
  if (line.kind === 'hunk') {
    return <HunkLine label={labels ? line.label : ''} expand={expand} onEdit={editable && side === 'right' ? onEdit : undefined} />;
  }
  const wrapping = wrap && !line.blank;
  const row = line.blank ? BLANK_ROW : wrapping ? WRAPPED_ROW : ROW;
  const sized = wrapping && height !== null ? { minHeight: height } : undefined;
  if (!cell) return <div className={`${row} bg-procgen/40`} style={sized} />;
  const changed = line.kind === 'change';
  const openable = Boolean(editable && side === 'right');
  const segments = codeSegments(cell.text, lineTokens, changed ? ranges : null);
  return (
    <div
      className={`group ${row} ${lineTone(side, changed, line.touched)} ${openable ? 'cursor-text' : ''}`}
      style={sized}
      onClick={openable && onEdit ? (event) => opensEditor(event.detail) && onEdit() : undefined}
    >
      <GutterCell line={line.blank ? null : cell.line} anchor={anchor} />
      <span className={collapsed ? FOLDED_TEXT : 'contents'}>
        <span
          {...{ [WRAPPED_CELL]: `${side}:${line.row}` }}
          className={codeClass(collapsed, wrapping)}
          style={wrapping && !collapsed ? hangingIndentStyle(cell.text) : undefined}
          onClick={onCodePress ? (event) => onCodePress(line, event) : undefined}
        >
          {(dim ? dimAroundName(segments, lineTokens) : segments).map((segment, index) => (
            <span
              key={index}
              className={segment.emphasized ? emphasisTone(side) : undefined}
              style={{ ...segment.style, opacity: segment.opacity }}
            >
              {segment.content}
            </span>
          ))}
        </span>
        {preview && <span className={FOLD_PREVIEW}>{preview}</span>}
      </span>
      {collapsed && anchor && <FoldBadge anchor={anchor} />}
    </div>
  );
}

// A collapsed row shows one ellipsised line, so it neither wraps nor hangs.
function codeClass(collapsed: boolean, wrapping: boolean): string {
  if (collapsed) return `${CODE} min-w-0 overflow-hidden text-ellipsis`;
  return wrapping ? WRAPPED_CODE : CODE;
}

// Negative text-indent pulls the first line back out of the padding the continuations sit in.
function hangingIndentStyle(text: string): { paddingLeft: string; textIndent: string } {
  const indent = hangingIndent(text);
  return { paddingLeft: `${indent}ch`, textIndent: `-${indent}ch` };
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
      {/* flex, not inline: an inline-block button leaves a baseline gap that unsettles a wrapped row. */}
      <span className="flex w-3 shrink-0 justify-center">{anchor && <CollapseChevron anchor={anchor} />}</span>
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
