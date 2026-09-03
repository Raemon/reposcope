'use client';

import { useState } from 'react';
import { ChangeCounts } from './ChangeCounts';
import { useColumnNav } from './columnNav';
import { ROW_HEIGHT } from './diffMetrics';
import { FileDiff } from './FileDiff';
import { ImageDiff } from './ImageDiff';
import { isImagePath } from './imageFiles';
import { imageSides } from './imageView';
import { useNearViewport } from './nearViewport';
import type { ChangedFile } from './pullRequests';
import { rowStateClass, type RowState } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

export function DiffFileSection({
  owner,
  repo,
  file,
  baseRef,
  headRef,
  selected,
  open,
  onToggle,
  sectionRef,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
  selected: boolean;
  open: boolean;
  onToggle: () => void;
  sectionRef: (node: HTMLElement | null) => void;
}) {
  const row = useColumnNav('diff').row(file.filename, selected);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const near = useNearViewport(node);
  return (
    <section
      ref={(element) => {
        setNode(element);
        sectionRef(element);
      }}
      className="border-b border-panel-edge"
    >
      <SelectableRow
        {...row.props}
        onActivate={onToggle}
        expanded={open}
        className={`sticky top-0 z-20 flex w-full items-baseline gap-2 border-b border-panel-edge px-2 py-[2px] text-left text-[11px] leading-4 ${sectionTone(row.state)}`}
      >
        <span aria-hidden className="w-3 shrink-0 text-[11px] text-ink-dim">
          {open ? '▾' : '▸'}
        </span>
        <span className="min-w-0 flex-1 truncate filename-text">
          {file.previousFilename && <span className="text-ink-dim">{file.previousFilename} → </span>}
          {file.filename}
        </span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{file.status}</span>
        <ChangeCounts additions={file.additions} deletions={file.deletions} />
      </SelectableRow>
      {open &&
        (near ? (
          <FileBody owner={owner} repo={repo} file={file} baseRef={baseRef} headRef={headRef} />
        ) : (
          <div style={{ height: unreadHeight(file) }} />
        ))}
    </section>
  );
}

// Stands in for a file too far off screen to draw, so the scrollbar spans the whole diff.
function unreadHeight(file: ChangedFile): number {
  return Math.max(1, file.additions + file.deletions) * ROW_HEIGHT;
}

function sectionTone(state: RowState): string {
  return state === 'plain' ? 'bg-panel text-ink' : rowStateClass(state);
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
    const { before, after } = imageSides(file, baseRef, headRef);
    return (
      <>
        <ImageDiff owner={owner} repo={repo} before={before} after={after} />
        {diff}
      </>
    );
  }
  if (diff) return diff;
  return <Note text={`${file.status} — no textual diff`} />;
}

function Note({ text }: { text: string }) {
  return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">{text}</p>;
}
