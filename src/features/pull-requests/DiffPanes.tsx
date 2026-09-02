'use client';

import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { DefinitionPeek } from './DefinitionPeek';
import { DefinitionPeekProvider } from './definitionPeekStore';
import { DiffFileSection } from './DiffFileSection';
import { DiffLayoutToggle } from './DiffLayoutToggle';
import { EditTarget } from './editTarget';
import { ImageThumbnailStrip } from './ImageThumbnailStrip';
import { imageFilesOf, isImagePath } from './imageFiles';
import type { ChangedFile, ChangedFileSet, PullRequestSummary } from './pullRequests';
import { PaneStatusLine } from '@/features/surface-ui/PaneStatusLine';

const SCROLL_MS = 100;

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
  sortable = true,
  onCommitted,
  ref,
}: {
  owner: string;
  repo: string;
  fileSet: ChangedFileSet | null;
  files: ChangedFile[];
  selected: string | null;
  editablePull?: PullRequestSummary | null;
  sortable?: boolean;
  onCommitted?: () => void | Promise<void>;
  ref?: Ref<DiffPanesHandle>;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const sections = useRef(new Map<string, HTMLElement>());
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const toggleFile = useCallback((path: string) => {
    setToggled((held) => ({ ...held, [path]: !openFile(held, path) }));
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToFile(path: string) {
      const container = scroller.current;
      const section = sections.current.get(path);
      if (!container || !section) return;
      animateScrollTop(container, scrollerOffset(container, section));
    },
    toggleFile,
  }));

  if (!fileSet) return <PaneStatusLine tone="dim" className="flex-1">Loading…</PaneStatusLine>;
  if (files.length === 0) return <PaneStatusLine tone="dim" className="flex-1">No files changed.</PaneStatusLine>;
  return (
    <EditTarget value={editablePull && { pull: editablePull, headRef: fileSet.headRef, onCommitted }}>
      <DefinitionPeekProvider owner={owner} repo={repo} fileSet={fileSet}>
        <div className="flex min-h-0 flex-1 flex-col">
          <DiffLayoutToggle sortable={sortable} />
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto bg-code">
            <ImageStrip
              key={`${fileSet.baseRef}:${fileSet.headRef}`}
              owner={owner}
              repo={repo}
              fileSet={fileSet}
              files={imageFilesOf(files)}
            />
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
