'use client';

import { ChangeCounts } from './ChangeCounts';
import { useColumnNav } from './columnNav';
import { FileDiff } from './FileDiff';
import { ImageDiff } from './ImageDiff';
import { isImagePath } from './imageFiles';
import { imageSides } from './imageView';
import type { ChangedFile } from './pullRequests';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { OpenOnGithubLink } from '@/features/surface-ui/OpenOnGithubLink';
import { rowStateClass, type RowState } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';
import { useCopiedFlag } from '@/features/surface-ui/useCopiedFlag';

const ACTION = 'rounded px-1 leading-4 text-ink-dim hover:bg-btn-hover hover:text-ink';
const ACTION_BAR = 'flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100';

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
  return (
    <section ref={sectionRef} className="border-b border-panel-edge">
      <div
        data-nav-cursor={row.props.cursor || undefined}
        onPointerEnter={row.props.onPointerEnter}
        className={`group sticky top-0 z-20 flex items-baseline gap-2 border-b border-panel-edge pr-2 text-[11px] leading-4 ${sectionTone(row.state)}`}
      >
        <SelectableRow
          {...row.props}
          onActivate={onToggle}
          expanded={open}
          className="flex min-w-0 flex-1 items-baseline gap-2 py-[2px] pl-2 text-left"
        >
          <span aria-hidden className="w-3 shrink-0 text-[11px] text-ink-dim">
            {open ? '▾' : '▸'}
          </span>
          <span className="min-w-0 flex-1 truncate filename-text">
            {file.previousFilename && <span className="text-ink-dim">{file.previousFilename} → </span>}
            {file.filename}
          </span>
          <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-ink-dim">{file.status}</span>
        </SelectableRow>
        <span className={ACTION_BAR}>
          <CopyPath path={file.filename} />
          <OpenOnGithubLink href={blobUrl(owner, repo, headRef, file.filename)} what={file.filename} className={ACTION} />
        </span>
        <ChangeCounts additions={file.additions} deletions={file.deletions} />
      </div>
      {open && <FileBody owner={owner} repo={repo} file={file} baseRef={baseRef} headRef={headRef} />}
    </section>
  );
}

function blobUrl(owner: string, repo: string, headRef: string, filename: string): string {
  return `https://github.com/${owner}/${repo}/blob/${headRef}/${filename}`;
}

function CopyPath({ path }: { path: string }) {
  const [copied, markCopied] = useCopiedFlag();
  const copy = () => void navigator.clipboard?.writeText(path).then(markCopied, () => {});
  return (
    <HoverCardTrigger label={copied ? 'copied path' : 'copy path'} focusable={false} tooltipStyle>
      <button type="button" aria-label={`Copy path ${path}`} onClick={copy} className={`${ACTION} ${copied ? 'text-accent' : ''}`}>
        ⧉
      </button>
    </HoverCardTrigger>
  );
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
