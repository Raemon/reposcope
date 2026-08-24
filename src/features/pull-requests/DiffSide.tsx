'use client';

import { Fragment, type ReactNode } from 'react';
import { hunkHasEditableLines, type EditableBlock } from './editableBlocks';
import { codeSegments } from './codeSegments';
import type { ThemedToken } from './diffHighlight';
import type { CharRange, IntralineRanges } from './intralineDiff';
import type { DiffCell, DiffRow } from './splitDiff';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
const GUTTER = 'w-[38px] shrink-0 select-none pr-1 text-right text-[9px] text-ink-dim';
const EDIT_BTN =
  'sticky right-0 shrink-0 rounded bg-procgen px-1 uppercase tracking-[0.14em] hover:bg-btn-hover hover:text-ink';

export interface HunkControl {
  expanded: boolean;
  hint: string;
  onToggle: (() => void) | null;
}

export interface SideProps {
  rows: DiffRow[];
  side: 'left' | 'right';
  labels: boolean;
  tokens: (ThemedToken[] | null)[] | null;
  emphasis: (IntralineRanges | null)[];
  expand: HunkControl;
  editable?: boolean;
  onEditBlock?: (rowIndex: number) => void;
  editor?: ReactNode;
  editedRows?: EditableBlock | null;
  spacer?: { afterRow: number; height: number } | null;
}

export function DiffSide(props: SideProps) {
  const { rows, editedRows, editor } = props;
  if (!editedRows) return <DiffRows {...props} from={0} to={rows.length} />;
  return (
    <div className="min-w-0 flex-1">
      <DiffRows {...props} from={0} to={editedRows.firstRow} />
      {editor}
      <DiffRows {...props} from={editedRows.lastRow + 1} to={rows.length} />
    </div>
  );
}

function DiffRows({
  rows,
  from,
  to,
  side,
  labels,
  tokens,
  emphasis,
  expand,
  editable,
  onEditBlock,
  spacer,
}: SideProps & { from: number; to: number }) {
  if (from >= to) return null;
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <div className="w-max min-w-full">
        {rows.slice(from, to).map((row, offset) => {
          const index = from + offset;
          return (
            <Fragment key={index}>
              <DiffLine
                row={row}
                cell={row[side]}
                side={side}
                labels={labels}
                lineTokens={tokens?.[index] ?? null}
                ranges={(side === 'left' ? emphasis[index]?.before : emphasis[index]?.after) ?? null}
                expand={expand}
                editable={editable}
                onEdit={editStarter(rows, index, onEditBlock)}
              />
              {spacer?.afterRow === index && <div style={{ height: spacer.height }} />}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function editStarter(rows: DiffRow[], index: number, onEditBlock?: (rowIndex: number) => void) {
  if (!onEditBlock) return undefined;
  const hunk = rows[index]?.kind === 'hunk';
  if (hunk && !hunkHasEditableLines(rows, index)) return undefined;
  return () => onEditBlock(index + (hunk ? 1 : 0));
}

function DiffLine({
  row,
  cell,
  side,
  labels,
  lineTokens,
  ranges,
  expand,
  editable,
  onEdit,
}: {
  row: DiffRow;
  cell: DiffCell | null;
  side: 'left' | 'right';
  labels: boolean;
  lineTokens: ThemedToken[] | null;
  ranges: CharRange[] | null;
  expand: HunkControl;
  editable?: boolean;
  onEdit?: () => void;
}) {
  if (row.kind === 'hunk') {
    return <HunkLine label={labels ? row.label : ''} expand={expand} onEdit={editable && side === 'right' ? onEdit : undefined} />;
  }
  if (!cell) return <div className={`${ROW} bg-procgen/40`} />;
  const changed = row.kind === 'change';
  const openable = Boolean(editable && side === 'right');
  return (
    <div
      className={`${ROW} ${lineTone(side, changed)} ${openable ? 'cursor-text' : ''}`}
      onClick={openable && onEdit ? (event) => event.detail >= 3 && onEdit() : undefined}
    >
      <span className={GUTTER}>{cell.line}</span>
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
    </div>
  );
}

function lineTone(side: 'left' | 'right', changed: boolean): string {
  if (!changed) return '';
  return side === 'left' ? 'bg-del-bg text-del-ink' : 'bg-add-bg text-add-ink';
}

function emphasisTone(side: 'left' | 'right'): string {
  return side === 'left' ? 'bg-del-emph' : 'bg-add-emph';
}

function HunkLine({ label, expand, onEdit }: { label: string; expand: HunkControl; onEdit?: () => void }) {
  const edit = onEdit ? (
    <button type="button" onClick={onEdit} title="Edit this hunk and commit the change" className={EDIT_BTN}>
      edit
    </button>
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
