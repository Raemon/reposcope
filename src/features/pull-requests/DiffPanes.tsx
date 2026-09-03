'use client';

import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { NearViewportProvider } from './nearViewport';
import { DefinitionPeek } from './DefinitionPeek';
import { DefinitionPeekProvider } from './definitionPeekStore';
import { DiffFileSection } from './DiffFileSection';
import { DiffLayoutToggle } from './DiffLayoutToggle';
import { EditTarget } from './editTarget';
import { ImageThumbnailStrip } from './ImageThumbnailStrip';
import { imageFilesOf, isImagePath } from './imageFiles';
import type { ChangedFile, ChangedFileSet, PullRequestSummary } from './pullRequests';

const SCROLL_MS = 100;
const REALIGN_TRIES = 6;

export interface DiffPanesHandle {
  scrollToFile: (path: string) => void;
  toggleFile: (path: string) => void;
}

export function DiffPanes({
  owner,
  repo,
  fileSet,
  files,
  selected,
  editablePull = null,
  onCommitted,
  ref,
}: {
  owner: string;
  repo: string;
  fileSet: ChangedFileSet | null;
  files: ChangedFile[];
  selected: string | null;
  editablePull?: PullRequestSummary | null;
  onCommitted?: () => void | Promise<void>;
  ref?: Ref<DiffPanesHandle>;
}) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const sections = useRef(new Map<string, HTMLElement>());
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const toggleFile = useCallback((path: string) => {
    setToggled((held) => ({ ...held, [path]: !openFile(held, path) }));
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToFile(path: string) {
      const section = sections.current.get(path);
      if (!scroller || !section) return;
      animateScrollTop(scroller, scrollerOffset(scroller, section));
      realignAfterDrawing(scroller, () => sections.current.get(path) ?? null);
    },
    toggleFile,
  }));

  if (!fileSet) return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">Loading…</p>;
  if (files.length === 0) return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">No files changed</p>;
  return (
    <EditTarget value={editablePull && { pull: editablePull, headRef: fileSet.headRef, onCommitted }}>
      <DefinitionPeekProvider owner={owner} repo={repo} fileSet={fileSet}>
        <div className="flex min-h-0 flex-1 flex-col">
          <DiffLayoutToggle />
          <div ref={setScroller} className="min-h-0 flex-1 overflow-y-auto bg-code">
            <ImageStrip
              key={`${fileSet.baseRef}:${fileSet.headRef}`}
              owner={owner}
              repo={repo}
              fileSet={fileSet}
              files={imageFilesOf(files)}
            />
            <NearViewportProvider root={scroller}>
              {files.map((file) => (
                <DiffFileSection
                  key={file.filename}
                  owner={owner}
                  repo={repo}
                  file={file}
                  baseRef={fileSet.baseRef}
                  headRef={fileSet.headRef}
                  selected={file.filename === selected}
                  open={openFile(toggled, file.filename)}
                  onToggle={() => toggleFile(file.filename)}
                  sectionRef={(node) => {
                    if (node) sections.current.set(file.filename, node);
                    else sections.current.delete(file.filename);
                  }}
                />
              ))}
            </NearViewportProvider>
          </div>
        </div>
        <DefinitionPeek />
      </DefinitionPeekProvider>
    </EditTarget>
  );
}

function openFile(toggled: Record<string, boolean>, path: string): boolean {
  return toggled[path] ?? !isImagePath(path);
}

function ImageStrip({
  owner,
  repo,
  fileSet,
  files,
}: {
  owner: string;
  repo: string;
  fileSet: ChangedFileSet;
  files: ChangedFile[];
}) {
  if (files.length === 0) return null;
  return <ImageThumbnailStrip owner={owner} repo={repo} files={files} baseRef={fileSet.baseRef} headRef={fileSet.headRef} />;
}

function scrollerOffset(container: HTMLElement, section: HTMLElement): number {
  return container.scrollTop + section.getBoundingClientRect().top - container.getBoundingClientRect().top;
}

// Files above the target draw as they near, moving it; re-align until heights settle.
function realignAfterDrawing(container: HTMLElement, section: () => HTMLElement | null) {
  let placed: number | null = null;
  let tries = 0;
  const settle = setInterval(() => {
    const target = section();
    if (!target || movedByHand(container, placed) || (tries += 1) > REALIGN_TRIES) return clearInterval(settle);
    container.scrollTop = scrollerOffset(container, target);
    placed = container.scrollTop;
  }, SCROLL_MS);
}

function movedByHand(container: HTMLElement, placed: number | null): boolean {
  return placed !== null && Math.abs(container.scrollTop - placed) > 1;
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
