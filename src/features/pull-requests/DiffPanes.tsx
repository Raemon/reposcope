'use client';

import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { ChangeCounts } from './ChangeCounts';
import { CodeBlockEditor } from './CodeBlockEditor';
import { CommitEditModal } from './CommitEditModal';
import { ImageDiff } from './ImageDiff';
import { hunkHasEditableLines, type EditableBlock } from './editableBlocks';
import { useHunkEdit, type HunkEdit } from './useHunkEdit';
import { isImagePath } from './imageFiles';
import { DragHandle, useDragWidth, type ColumnSize } from './ResizableColumn';
import { ROW_HEIGHT, SAVE_BAR } from './diffMetrics';
import { sortByFolder } from './fileTree';
import { splitDiff, type DiffCell, type DiffRow } from './splitDiff';
import { expandDiff, splitLines } from './expandDiff';
import { langForPath, tokenizeCode, type ThemedToken } from './diffHighlight';
import { intralineRanges, type CharRange, type IntralineRanges } from './intralineDiff';
import type { ChangedFile, ChangedFileSet, FileText, PullRequestSummary } from './pullRequests';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken } from '@/features/sources/sourceStore';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
const GUTTER = 'w-[38px] shrink-0 select-none pr-1 text-right text-[9px] text-ink-dim';
const SCROLL_MS = 100;
const EXPAND_MS = 200;
const EDIT_BTN =
  'sticky right-0 shrink-0 rounded border border-btn-edge bg-procgen px-1 uppercase tracking-[0.14em] hover:bg-btn-hover hover:text-ink';

export interface DiffPanesHandle {
  scrollToFile: (path: string) => void;
}

const EditTarget = createContext<{ pull: PullRequestSummary; headRef: string; onCommitted?: () => void } | null>(
  null,
);

export function DiffPanes({
  owner,
  repo,
  fileSet,
  editablePull = null,
  onCommitted,
  ref,
}: {
  owner: string;
  repo: string;
  fileSet: ChangedFileSet | null;
  editablePull?: PullRequestSummary | null;
  onCommitted?: () => void;
  ref?: Ref<DiffPanesHandle>;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const sections = useRef(new Map<string, HTMLElement>());

  useImperativeHandle(ref, () => ({
    scrollToFile(path: string) {
      const container = scroller.current;
      const section = sections.current.get(path);
      if (!container || !section) return;
      const top = container.scrollTop + section.getBoundingClientRect().top - container.getBoundingClientRect().top;
      animateScrollTop(container, top);
    },
  }));

  if (!fileSet) return <Note text="Loading…" />;
  if (fileSet.files.length === 0) return <Note text="No files changed" />;
  return (
    <EditTarget value={editablePull && { pull: editablePull, headRef: fileSet.headRef, onCommitted }}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {sortByFolder(fileSet.files).map((file) => (
          <FileSection
            key={file.filename}
            owner={owner}
            repo={repo}
            file={file}
            baseRef={fileSet.baseRef}
            headRef={fileSet.headRef}
            sectionRef={(node) => {
              if (node) sections.current.set(file.filename, node);
              else sections.current.delete(file.filename);
            }}
          />
        ))}
      </div>
    </EditTarget>
  );
}

function animateScrollTop(container: HTMLElement, target: number) {
  const start = container.scrollTop;
  const end = Math.max(0, Math.min(target, container.scrollHeight - container.clientHeight));
  const began = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - began) / SCROLL_MS);
    const eased = 1 - (1 - progress) * (1 - progress);
    container.scrollTop = start + (end - start) * eased;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function FileSection({
  owner,
  repo,
  file,
  baseRef,
  headRef,
  sectionRef,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
  sectionRef: (node: HTMLElement | null) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section ref={sectionRef} className="border-b border-panel-edge">
      <SelectableRow
        onActivate={() => setOpen((was) => !was)}
        expanded={open}
        className="sticky top-0 z-20 flex w-full items-baseline gap-2 border-b border-panel-edge bg-panel px-2 py-[2px] text-left text-[11px] leading-4 hover:bg-btn-hover"
      >
        <span aria-hidden className="w-2 shrink-0 text-[9px] text-ink-dim">
          {open ? '▾' : '▸'}
        </span>
        <span className="min-w-0 flex-1 truncate text-ink">
          {file.previousFilename && <span className="text-ink-dim">{file.previousFilename} → </span>}
          {file.filename}
        </span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{file.status}</span>
        <ChangeCounts additions={file.additions} deletions={file.deletions} />
      </SelectableRow>
      {open && <FileBody owner={owner} repo={repo} file={file} baseRef={baseRef} headRef={headRef} />}
    </section>
  );
}

function FileBody({
  owner,
  repo,
  file,
  baseRef,
  headRef,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
}) {
  const diff = file.patch ? <FileDiff owner={owner} repo={repo} file={file} baseRef={baseRef} headRef={headRef} /> : null;
  if (isImagePath(file.filename)) {
    return (
      <>
        <ImageDiff
          owner={owner}
          repo={repo}
          before={file.status === 'added' ? null : { ref: baseRef, path: file.previousFilename ?? file.filename }}
          after={file.status === 'removed' ? null : { ref: headRef, path: file.filename }}
        />
        {diff}
      </>
    );
  }
  if (diff) return diff;
  return <Note text={`${file.status} — no textual diff`} />;
}

function FileDiff({
  owner,
  repo,
  file,
  baseRef,
  headRef,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
}) {
  const token = useGithubToken();
  const target = useContext(EditTarget);
  const [removedSize, setRemovedSize] = useState<ColumnSize>({ width: 520, open: true });
  const startDrag = useDragWidth(removedSize, setRemovedSize);
  const [wantWholeFile, setWantWholeFile] = useState(false);

  const wholeFile = useWholeFile(owner, repo, file, baseRef, headRef, wantWholeFile);
  const patchRows = useMemo(() => splitDiff(file.patch ?? ''), [file.patch]);
  const rows = useMemo(
    () => (wholeFile.lines ? expandDiff(patchRows, wholeFile.lines.base, wholeFile.lines.head) : patchRows),
    [patchRows, wholeFile.lines],
  );
  const emphasis = useIntralineEmphasis(rows);
  const tokens = useDiffTokens(rows, file.filename);
  const growing = useHeightTransition(rows);
  const pull = target?.pull ?? null;
  const hunkEdit = useHunkEdit({
    owner,
    repo,
    pull,
    headRef: target?.headRef ?? '',
    rows: patchRows,
    filename: file.filename,
    patch: file.patch ?? '',
    token,
    onCommitted: target?.onCommitted,
  });
  const showingWholeFile = rows !== patchRows;
  const canEdit = pull !== null && !showingWholeFile;
  const covered = hunkEdit.edit ? coveredHeight(hunkEdit.edit.block) : 0;
  const expand: HunkControl = {
    expanded: showingWholeFile,
    hint: hunkHint(wholeFile, showingWholeFile),
    onToggle: wholeFile.available ? () => toggleWholeFile(hunkEdit, setWantWholeFile) : null,
  };

  return (
    <div ref={growing} className="flex">
      <section
        className="relative flex shrink-0 flex-col border-r border-panel-edge"
        style={{ width: removedSize.width }}
      >
        <DiffSide
          rows={rows}
          side="left"
          labels
          tokens={tokens?.left ?? null}
          emphasis={emphasis}
          expand={expand}
          spacer={canEdit ? spacerFor(hunkEdit.edit) : null}
        />
        <DragHandle onPointerDown={startDrag} />
      </section>
      <section className="flex min-w-0 flex-1 flex-col">
        <DiffSide
          rows={rows}
          side="right"
          labels={false}
          tokens={tokens?.right ?? null}
          emphasis={emphasis}
          expand={expand}
          editable={canEdit}
          onEditBlock={hunkEdit.begin}
          editedRows={canEdit ? hunkEdit.edit?.block ?? null : null}
          editor={
            canEdit && hunkEdit.edit && (
              <CodeBlockEditor
                key={hunkEdit.edit.block.firstRow}
                value={hunkEdit.edit.draft}
                lang={langForPath(file.filename)}
                caretLine={hunkEdit.edit.block.caretLine}
                minHeight={covered}
                saving={hunkEdit.committing}
                onChange={hunkEdit.setDraft}
                onSave={hunkEdit.askToCommit}
                onExit={hunkEdit.askToCommit}
              />
            )
          }
        />
      </section>
      {hunkEdit.message !== null && hunkEdit.edit !== null && (
        <CommitEditModal
          path={file.filename}
          message={hunkEdit.message}
          committing={hunkEdit.committing}
          error={hunkEdit.failure}
          onMessage={hunkEdit.setMessage}
          onCommit={hunkEdit.commit}
          onRevert={hunkEdit.close}
          onCancel={hunkEdit.dismissModal}
        />
      )}
    </div>
  );
}

function toggleWholeFile(hunkEdit: ReturnType<typeof useHunkEdit>, setWantWholeFile: (update: (was: boolean) => boolean) => void) {
  if (hunkEdit.edit && hunkEdit.edit.draft !== hunkEdit.edit.block.text) return;
  hunkEdit.close();
  setWantWholeFile((was) => !was);
}

function coveredHeight(block: EditableBlock): number {
  return (block.lastRow - block.firstRow + 1) * ROW_HEIGHT;
}

function spacerFor(edit: HunkEdit | null): { afterRow: number; height: number } | null {
  if (!edit) return null;
  const covered = coveredHeight(edit.block);
  const drawn = Math.max(covered, edit.draft.split('\n').length * ROW_HEIGHT + SAVE_BAR);
  return { afterRow: edit.block.lastRow, height: drawn - covered };
}

interface HunkControl {
  expanded: boolean;
  hint: string;
  onToggle: (() => void) | null;
}

interface WholeFile {
  available: boolean;
  loading: boolean;
  error: string | null;
  lines: { base: string[]; head: string[] } | null;
}

function hunkHint(wholeFile: WholeFile, expanded: boolean): string {
  if (!wholeFile.available) return '';
  if (wholeFile.error) return `▸ ${wholeFile.error}`;
  if (wholeFile.loading) return '▾ loading whole file…';
  return expanded ? '▾ whole file — click to show changed lines only' : '▸ click to show whole file';
}

function useWholeFile(
  owner: string,
  repo: string,
  file: ChangedFile,
  baseRef: string,
  headRef: string,
  wanted: boolean,
): WholeFile {
  const token = useGithubToken();
  const [lines, setLines] = useState<{ base: string[]; head: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);
  const available = file.status !== 'added' && file.status !== 'removed';
  const basePath = file.previousFilename ?? file.filename;
  const headPath = file.filename;

  useEffect(() => {
    if (!wanted || !available || requested.current) return;
    requested.current = true;
    const controller = new AbortController();
    Promise.all([
      readText(owner, repo, baseRef, basePath, token, controller.signal),
      readText(owner, repo, headRef, headPath, token, controller.signal),
    ])
      .then(([base, head]) => {
        if (base.text === null || head.text === null) {
          setError('file too large to expand');
          return;
        }
        setLines({ base: splitLines(base.text), head: splitLines(head.text) });
      })
      .catch((issue: unknown) => {
        if (controller.signal.aborted) return;
        requested.current = false;
        setError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [wanted, available, owner, repo, baseRef, headRef, basePath, headPath, token]);

  return { available, loading: wanted && !lines && !error, error, lines: wanted ? lines : null };
}

function readText(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  token: string | null,
  signal: AbortSignal,
): Promise<FileText> {
  const query = `owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`;
  return apiJson<FileText>(`/api/github/file?${query}`, token, signal);
}

function useHeightTransition(rows: DiffRow[]) {
  const node = useRef<HTMLDivElement | null>(null);
  const measured = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const height = element.scrollHeight;
    const from = measured.current;
    measured.current = height;
    if (from === null || from === height) return;
    element.style.overflow = 'hidden';
    element.style.height = `${from}px`;
    element.style.transition = '';

    let settle: ReturnType<typeof setTimeout> | null = null;
    // Rendering the added rows costs a frame; start the transition after it so
    // the reader sees the whole 200ms of growth rather than a jump into it.
    const start = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        element.style.transition = `height ${EXPAND_MS}ms ease-out`;
        element.style.height = `${height}px`;
        settle = setTimeout(() => {
          element.style.transition = '';
          element.style.height = '';
          element.style.overflow = '';
        }, EXPAND_MS);
      }),
    );
    return () => {
      cancelAnimationFrame(start);
      if (settle) clearTimeout(settle);
    };
  }, [rows]);

  return node;
}

function useIntralineEmphasis(rows: DiffRow[]): (IntralineRanges | null)[] {
  return useMemo(
    () =>
      rows.map((row) =>
        row.kind === 'change' && row.left && row.right ? intralineRanges(row.left.text, row.right.text) : null,
      ),
    [rows],
  );
}

interface SideTokens {
  left: (ThemedToken[] | null)[];
  right: (ThemedToken[] | null)[];
}

function useDiffTokens(rows: DiffRow[], filename: string): SideTokens | null {
  const [tokens, setTokens] = useState<SideTokens | null>(null);
  const tokenizedOnce = useRef(false);
  useEffect(() => {
    setTokens(null);
    const lang = langForPath(filename);
    if (!lang) return;
    let cancelled = false;
    const textOf = (cells: (DiffCell | null)[]) =>
      cells
        .filter((cell): cell is DiffCell => cell !== null)
        .map((cell) => cell.text)
        .join('\n');
    const highlight = () =>
      Promise.all([
        tokenizeCode(textOf(rows.map((row) => row.left)), lang),
        tokenizeCode(textOf(rows.map((row) => row.right)), lang),
      ]).then(([leftLines, rightLines]) => {
        if (cancelled || (!leftLines && !rightLines)) return;
        const left: (ThemedToken[] | null)[] = [];
        const right: (ThemedToken[] | null)[] = [];
        let leftIndex = 0;
        let rightIndex = 0;
        for (const row of rows) {
          left.push(row.left && leftLines ? (leftLines[leftIndex] ?? null) : null);
          if (row.left) leftIndex += 1;
          right.push(row.right && rightLines ? (rightLines[rightIndex] ?? null) : null);
          if (row.right) rightIndex += 1;
        }
        setTokens({ left, right });
      });

    // Highlighting a whole file blocks the main thread, so let the expand
    // animation finish before re-tokenizing rows the reader is already seeing.
    const delay = tokenizedOnce.current ? EXPAND_MS : 0;
    tokenizedOnce.current = true;
    const scheduled = setTimeout(highlight, delay);
    return () => {
      cancelled = true;
      clearTimeout(scheduled);
    };
  }, [rows, filename]);
  return tokens;
}

interface SideProps {
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

function DiffSide(props: SideProps) {
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
  const tone = !changed ? '' : side === 'left' ? 'bg-del-bg text-del-ink' : 'bg-add-bg text-add-ink';
  const emphasisTone = side === 'left' ? 'bg-del-emph' : 'bg-add-emph';
  const openable = editable && side === 'right';
  return (
    <div
      className={`${ROW} ${tone} ${openable ? 'cursor-text' : ''}`}
      onClick={openable && onEdit ? (event) => event.detail >= 3 && onEdit() : undefined}
    >
      <span className={GUTTER}>{cell.line}</span>
      <span className="diff-code whitespace-pre pr-2 text-[11px]">
        {codeSegments(cell.text, lineTokens, changed ? ranges : null).map((segment, index) => (
          <span
            key={index}
            className={segment.emphasized ? emphasisTone : undefined}
            style={segment.style}
          >
            {segment.content}
          </span>
        ))}
      </span>
    </div>
  );
}

interface CodeSegment {
  content: string;
  style?: CSSProperties;
  emphasized: boolean;
}

function codeSegments(
  text: string,
  lineTokens: ThemedToken[] | null,
  ranges: CharRange[] | null,
): CodeSegment[] {
  const colored: { content: string; style?: CSSProperties }[] = lineTokens?.length
    ? lineTokens.map((token) => ({ content: token.content, style: token.htmlStyle as CSSProperties }))
    : [{ content: text }];
  if (!ranges?.length) return colored.map((piece) => ({ ...piece, emphasized: false }));

  const segments: CodeSegment[] = [];
  let offset = 0;
  for (const piece of colored) {
    for (const part of splitAtRanges(offset, piece.content, ranges)) {
      segments.push({ content: part.content, style: piece.style, emphasized: part.emphasized });
    }
    offset += piece.content.length;
  }
  return segments;
}

function splitAtRanges(start: number, text: string, ranges: CharRange[]) {
  const parts: { content: string; emphasized: boolean }[] = [];
  let position = 0;
  while (position < text.length) {
    const absolute = start + position;
    const inside = ranges.find((range) => absolute >= range.start && absolute < range.end);
    const nextStart = ranges.find((range) => range.start > absolute)?.start ?? start + text.length;
    const stop = Math.min(text.length, (inside ? inside.end : nextStart) - start);
    parts.push({ content: text.slice(position, stop), emphasized: Boolean(inside) });
    position = stop;
  }
  return parts;
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

function Note({ text }: { text: string }) {
  return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">{text}</p>;
}
