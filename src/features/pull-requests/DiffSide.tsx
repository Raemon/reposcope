'use client';

import { Fragment, type ReactNode } from 'react';
import { hunkHasEditableLines, type EditableBlock } from './editableBlocks';
import { codeSegments } from './codeSegments';
import type { DiffLine } from './diffLines';
import type { ThemedToken } from './diffHighlight';
import type { CharRange, IntralineRanges } from './intralineDiff';
import type { DiffRow } from './splitDiff';
import type { CollapseAnchor } from './useCodeCollapse';
import type { SideTokens } from './useDiffSideHighlight';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
const GUTTER = 'w-[38px] shrink-0 select-none pr-1 text-right text-[9px] text-ink-dim';
const TOUCHED_MARK = 'bg-add-bg/60 shadow-[inset_2px_0_0_var(--add-emph)]';
const EDIT_BTN =
  'sticky right-0 shrink-0 rounded bg-procgen px-1 uppercase tracking-[0.14em] hover:bg-btn-hover hover:text-ink';
const FOLD_BADGE =
  'mr-2 shrink-0 rounded bg-procgen px-1 text-[9px] italic text-ink-dim hover:bg-btn-hover hover:text-ink';

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
}: SideProps & { from: number; to: number }) {
  if (from >= to) return null;
  const spacerLine = spacer ? lastLineOfRow(lines, spacer.afterRow) : -1;
  const rowsWithRightLine = new Set(lines.flatMap((line) => (line.side === 'right' ? [line.row] : [])));
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <div className="w-max min-w-full">
        {lines.slice(from, to).map((line, offset) => {
          const index = from + offset;
          return (
            <Fragment key={index}>
              <DiffLineView
                line={line}
                labels={labels}
                lineTokens={tokens?.[line.side][line.row] ?? null}
                ranges={rangesFor(emphasis[line.row], line.side)}
                expand={expand}
                anchor={anchorOf(line, anchors, rowsWithRightLine)}
                editable={editable}
                onEdit={editStarter(rows, line.row, onEditBlock)}
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
  editable,
  onEdit,
}: {
  line: DiffLine;
  labels: boolean;
  lineTokens: ThemedToken[] | null;
  ranges: CharRange[] | null;
  expand: HunkControl;
  anchor: CollapseAnchor | null;
  editable?: boolean;
  onEdit?: () => void;
}) {
  const { cell, side } = line;
  if (line.kind === 'hunk') {
    return <HunkLine label={labels ? line.label : ''} expand={expand} onEdit={editable && side === 'right' ? onEdit : undefined} />;
  }
  if (!cell) return <div className={`${ROW} bg-procgen/40`} />;
  const changed = line.kind === 'change';
  const openable = Boolean(editable && side === 'right');
  return (
    <div
      className={`group ${ROW} ${lineTone(side, changed, line.touched)} ${openable ? 'cursor-text' : ''}`}
      onClick={openable && onEdit ? (event) => event.detail >= 3 && onEdit() : undefined}
    >
      <GutterCell line={cell.line} anchor={anchor} />
      <span className="diff-code whitespace-pre pr-2 text-[11px]">
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
      {anchor?.collapsed && (
        <button type="button" onClick={anchor.toggle} className={FOLD_BADGE}>
          {foldLabel(anchor)}
        </button>
      )}
    </div>
  );
}

function foldLabel(anchor: CollapseAnchor): string {
  const folded = `⋯ ${anchor.hiddenLines} ${anchor.hiddenLines === 1 ? 'line' : 'lines'}`;
  if (anchor.hiddenThreads === 0) return folded;
  return `${folded} · ${anchor.hiddenThreads} ${anchor.hiddenThreads === 1 ? 'thread' : 'threads'}`;
}

function GutterCell({ line, anchor }: { line: number; anchor: CollapseAnchor | null }) {
  if (!anchor) return <span className={GUTTER}>{line}</span>;
  return (
    <span className={`${GUTTER} flex items-center justify-end gap-0.5`}>
      <CollapseChevron anchor={anchor} />
      <span>{line}</span>
    </span>
  );
}

function CollapseChevron({ anchor }: { anchor: CollapseAnchor }) {
  return (
    <button
      type="button"
      onClick={anchor.toggle}
      aria-label={anchor.collapsed ? 'Expand code block' : 'Collapse code block'}
      className={`shrink-0 text-[8px] leading-[15px] text-ink-dim hover:text-ink ${
        anchor.collapsed ? '' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      {anchor.collapsed ? '▸' : '▾'}
    </button>
  );
}

function lineTone(side: 'left' | 'right', changed: boolean, touched: boolean): string {
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
      {expand.hint && <span className="shrink-0 text-ink-dim/80">{expand.hint}</span>}
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
