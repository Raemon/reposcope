'use client';

import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import { ChangeCounts } from './ChangeCounts';
import { ImageDiff } from './ImageDiff';
import { isImagePath } from './imageFiles';
import { DragHandle, useDragWidth, type ColumnSize } from './ResizableColumn';
import { sortByFolder } from './fileTree';
import { splitDiff, type DiffCell, type DiffRow } from './splitDiff';
import { langForPath, tokenizeCode, type ThemedToken } from './diffHighlight';
import type { ChangedFile, ChangedFileSet } from './pullRequests';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex h-[15px] items-center gap-1 leading-[15px]';
const GUTTER = 'w-[38px] shrink-0 select-none pr-1 text-right text-[9px] text-ink-dim';
const SCROLL_MS = 100;

export interface DiffPanesHandle {
  scrollToFile: (path: string) => void;
}

export function DiffPanes({
  owner,
  repo,
  fileSet,
  ref,
}: {
  owner: string;
  repo: string;
  fileSet: ChangedFileSet | null;
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
  if (isImagePath(file.filename)) {
    return (
      <>
        <ImageDiff
          owner={owner}
          repo={repo}
          before={file.status === 'added' ? null : { ref: baseRef, path: file.previousFilename ?? file.filename }}
          after={file.status === 'removed' ? null : { ref: headRef, path: file.filename }}
        />
        {file.patch && <FileDiff patch={file.patch} filename={file.filename} />}
      </>
    );
  }
  if (file.patch) return <FileDiff patch={file.patch} filename={file.filename} />;
  return <Note text={`${file.status} — no textual diff`} />;
}

function FileDiff({ patch, filename }: { patch: string; filename: string }) {
  const [removedSize, setRemovedSize] = useState<ColumnSize>({ width: 520, open: true });
  const startDrag = useDragWidth(removedSize, setRemovedSize);

  const rows = splitDiff(patch);
  const tokens = useDiffTokens(patch, filename);
  return (
    <div className="flex">
      <section
        className="relative flex shrink-0 flex-col border-r border-panel-edge"
        style={{ width: removedSize.width }}
      >
        <DiffSide rows={rows} side="left" labels tokens={tokens?.left ?? null} />
        <DragHandle onPointerDown={startDrag} />
      </section>
      <section className="flex min-w-0 flex-1 flex-col">
        <DiffSide rows={rows} side="right" labels={false} tokens={tokens?.right ?? null} />
      </section>
    </div>
  );
}

interface SideTokens {
  left: (ThemedToken[] | null)[];
  right: (ThemedToken[] | null)[];
}

function useDiffTokens(patch: string, filename: string): SideTokens | null {
  const [tokens, setTokens] = useState<SideTokens | null>(null);
  useEffect(() => {
    setTokens(null);
    const lang = langForPath(filename);
    if (!lang) return;
    let cancelled = false;
    const rows = splitDiff(patch);
    const textOf = (cells: (DiffCell | null)[]) =>
      cells
        .filter((cell): cell is DiffCell => cell !== null)
        .map((cell) => cell.text)
        .join('\n');
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
    return () => {
      cancelled = true;
    };
  }, [patch, filename]);
  return tokens;
}

function DiffSide({
  rows,
  side,
  labels,
  tokens,
}: {
  rows: DiffRow[];
  side: 'left' | 'right';
  labels: boolean;
  tokens: (ThemedToken[] | null)[] | null;
}) {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <div className="w-max min-w-full">
        {rows.map((row, index) => (
          <DiffLine
            key={index}
            row={row}
            cell={side === 'left' ? row.left : row.right}
            side={side}
            labels={labels}
            lineTokens={tokens?.[index] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function DiffLine({
  row,
  cell,
  side,
  labels,
  lineTokens,
}: {
  row: DiffRow;
  cell: DiffCell | null;
  side: 'left' | 'right';
  labels: boolean;
  lineTokens: ThemedToken[] | null;
}) {
  if (row.kind === 'hunk') {
    return (
      <div className={`${ROW} bg-procgen px-1 text-[9px] text-ink-dim`}>
        <span className="truncate">{labels ? row.label : ''}</span>
      </div>
    );
  }
  if (!cell) return <div className={`${ROW} bg-procgen/40`} />;
  const changed = row.kind === 'change';
  const tone = !changed ? '' : side === 'left' ? 'bg-del-bg text-del-ink' : 'bg-add-bg text-add-ink';
  return (
    <div className={`${ROW} ${tone}`}>
      <span className={GUTTER}>{cell.line}</span>
      <span className="diff-code whitespace-pre pr-2 text-[11px]">
        {lineTokens?.length
          ? lineTokens.map((token, index) => (
              <span key={index} style={token.htmlStyle as CSSProperties}>
                {token.content}
              </span>
            ))
          : cell.text}
      </span>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">{text}</p>;
}
