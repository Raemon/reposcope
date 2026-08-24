'use client';

import { useImperativeHandle, useRef, type Ref } from 'react';
import { DiffFileSection } from './DiffFileSection';
import { EditTarget } from './editTarget';
import { sortByFolder } from './fileTree';
import type { ChangedFileSet, PullRequestSummary } from './pullRequests';

const SCROLL_MS = 100;

export interface DiffPanesHandle {
  scrollToFile: (path: string) => void;
}

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
      animateScrollTop(container, scrollerOffset(container, section));
    },
  }));

  if (!fileSet) return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">Loading…</p>;
  if (fileSet.files.length === 0) return <p className="flex-1 px-2 py-1 text-[11px] text-ink-dim">No files changed</p>;
  return (
    <EditTarget value={editablePull && { pull: editablePull, headRef: fileSet.headRef, onCommitted }}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {sortByFolder(fileSet.files).map((file) => (
          <DiffFileSection
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
