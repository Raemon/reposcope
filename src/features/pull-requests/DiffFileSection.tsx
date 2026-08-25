'use client';

import { ChangeCounts } from './ChangeCounts';
import { FileDiff } from './FileDiff';
import { ImageDiff } from './ImageDiff';
import { isImagePath } from './imageFiles';
import { imageSides } from './imageView';
import type { ChangedFile } from './pullRequests';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

export function DiffFileSection({
  owner,
  repo,
  file,
  baseRef,
  headRef,
  expanded,
  onToggle,
  sectionRef,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
  expanded: boolean;
  onToggle: () => void;
  sectionRef: (node: HTMLElement | null) => void;
}) {
  return (
    <section ref={sectionRef} className="border-b border-panel-edge">
      <SelectableRow
        onActivate={onToggle}
        expanded={expanded}
        className="sticky top-0 z-20 flex w-full items-baseline gap-2 border-b border-panel-edge bg-panel px-2 py-[2px] text-left text-[11px] leading-4 hover:bg-btn-hover"
      >
        <span aria-hidden className="w-2 shrink-0 text-[9px] text-ink-dim">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="min-w-0 flex-1 truncate text-ink">
          {file.previousFilename && <span className="text-ink-dim">{file.previousFilename} → </span>}
          {file.filename}
        </span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{file.status}</span>
        <ChangeCounts additions={file.additions} deletions={file.deletions} />
      </SelectableRow>
      <FileBody owner={owner} repo={repo} file={file} baseRef={baseRef} headRef={headRef} expanded={expanded} />
    </section>
  );
}

function FileBody({
  owner,
  repo,
  file,
  baseRef,
  headRef,
  expanded,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
  expanded: boolean;
}) {
  const diff = file.patch ? (
    <FileDiff owner={owner} repo={repo} file={file} baseRef={baseRef} headRef={headRef} outline={!expanded} />
  ) : null;
  if (!expanded) return diff;
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
