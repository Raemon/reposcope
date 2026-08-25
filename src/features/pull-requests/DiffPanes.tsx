'use client';

import { useImperativeHandle, useRef, type Ref } from 'react';
import { DiffFileSection } from './DiffFileSection';
import { DiffToolbar } from './DiffToolbar';
import { useFileFolds } from './fileFolds';
import { EditTarget } from './editTarget';
import { ImageThumbnailStrip } from './ImageThumbnailStrip';
import { imageFilesOf } from './imageFiles';
import { ReviewThreadProvider } from './reviewThreadStore';
import { sortByFolder } from './fileTree';
import type { ChangedFile, ChangedFileSet, PullRequestSummary } from './pullRequests';

const SCROLL_MS = 100;

export interface DiffPanesHandle {
  scrollToFile: (path: string) => void;
}

export function DiffPanes({
  owner,
  repo,
  number,
  fileSet,
  editablePull = null,
  onCommitted,
  ref,
}: {
  owner: string;
  repo: string;
  number: number;
  fileSet: ChangedFileSet | null;
  editablePull?: PullRequestSummary | null;
  onCommitted?: () => void | Promise<void>;
  ref?: Ref<DiffPanesHandle>;
}) {
  const folds = useFileFolds(fileSet ? `${fileSet.baseRef}:${fileSet.headRef}` : '');
  const scroller = useRef<HTMLDivElement | null>(null);
  const sections = useRef(new Map<string, HTMLElement>());

  useImperativeHandle(ref, () => ({
    scrollToFile(path: string) {
      const container = scroller.current;
      const section = sections.current.get(path);
      if (!container || !section) return;
      animateScrollTop(container, scrollerOffset(container, section));
    },
  }));

  if (!fileSet) return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">Loading…</p>;
  if (fileSet.files.length === 0) return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">No files changed</p>;
  const orderedFiles = sortByFolder(fileSet.files);
  return (
    <EditTarget value={editablePull && { pull: editablePull, headRef: fileSet.headRef, onCommitted }}>
      <ReviewThreadProvider owner={owner} repo={repo} number={number}>
        <div className="flex min-h-0 flex-1 flex-col">
          <DiffToolbar folds={folds} />
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
            <ImageStrip
              key={`${fileSet.baseRef}:${fileSet.headRef}`}
              owner={owner}
              repo={repo}
              fileSet={fileSet}
              files={imageFilesOf(orderedFiles)}
            />
            {orderedFiles.map((file) => (
              <DiffFileSection
                key={file.filename}
                owner={owner}
                repo={repo}
                file={file}
                baseRef={fileSet.baseRef}
                headRef={fileSet.headRef}
                expanded={folds.expanded(file.filename)}
                onToggle={() => folds.toggle(file.filename)}
                sectionRef={(node) => {
                  if (node) sections.current.set(file.filename, node);
                  else sections.current.delete(file.filename);
                }}
              />
            ))}
          </div>
        </div>
      </ReviewThreadProvider>
    </EditTarget>
  );
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
