'use client';

import { useEffect, useRef, useState } from 'react';
import { TreeBranchLabel, TreeLeafLabel } from '@/features/api-surface/TreeRowLabel';
import { Chip } from './Chip';
import { InsightPanel, InsightSection } from './InsightSection';
import type { TestFile, TestSurface } from '../insightTypes';

export function TestsView({ tests, reveal }: { tests: TestSurface; reveal: string | null }) {
  const areas = new Map<string, TestFile[]>();
  for (const file of tests.files) {
    const area = file.file.includes('/') ? file.file.split('/')[0]! : '(root)';
    areas.set(area, [...(areas.get(area) ?? []), file]);
  }
  return (
    <InsightSection
      id="tests"
      kicker="What the suite pins down"
      title="Tests"
      blurb="Each test file and the behavior it names. A quick answer to the question every hands-off coder eventually asks: is the thing I care about actually covered?"
      stat={`${tests.caseCount} cases in ${tests.files.length} files`}
      as="h1"
    >
      <InsightPanel className="px-2 py-1.5">
        {[...areas].map(([area, files]) => <TestArea key={area} area={area} files={files} reveal={reveal} />)}
      </InsightPanel>
    </InsightSection>
  );
}

function TestArea({ area, files, reveal }: { area: string; files: TestFile[]; reveal: string | null }) {
  const [open, setOpen] = useState(true);
  const total = files.reduce((sum, file) => sum + file.caseCount, 0);
  const holdsReveal = files.some((file) => file.file === reveal);

  useEffect(() => {
    if (holdsReveal) setOpen(true);
  }, [reveal]);

  return (
    <>
      <TreeBranchLabel open={open} onToggle={() => setOpen(!open)} depth={0} label={area}>
        <span className="flex items-baseline gap-2 py-0.5">
          <span className="font-mono text-[11px] text-accent">{area}/</span>
          <span className="font-mono text-[10px] text-ink-dim">{total} cases · {files.length} files</span>
        </span>
      </TreeBranchLabel>
      {open ? files.map((file) => <TestFileRows key={file.file} file={file} reveal={reveal} />) : null}
    </>
  );
}

function TestFileRows({ file, reveal }: { file: TestFile; reveal: string | null }) {
  const revealed = file.file === reveal;
  const [open, setOpen] = useState(revealed);
  const row = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!revealed) return;
    setOpen(true);
    row.current?.scrollIntoView({ block: 'center' });
  }, [reveal]);

  return (
    <>
      <TreeBranchLabel open={open} onToggle={() => setOpen(!open)} depth={1} label={file.file}>
        <span
          ref={row}
          data-reveal={revealed ? 'true' : undefined}
          className={`flex min-w-0 items-baseline gap-2 py-0.5 ${revealed ? 'rounded-sm bg-procgen px-1 ring-1 ring-accent' : ''}`}
        >
          <span className="truncate font-mono text-[11px] text-ink">{file.file}</span>
          <Chip>{file.framework}</Chip>
          <span className="whitespace-nowrap font-mono text-[10px] text-ink-dim">{file.caseCount}</span>
        </span>
      </TreeBranchLabel>
      {open
        ? file.cases.map((held) => (
            <TreeLeafLabel key={`${file.file}:${held.line}`} depth={2} glyph="·">
              <span className="py-0.5 font-mono text-[11px] leading-4 text-ink-dim">{held.name}</span>
            </TreeLeafLabel>
          ))
        : null}
      {open && file.caseCount > file.cases.length ? (
        <TreeLeafLabel depth={2} glyph=" ">
          <span className="py-0.5 font-mono text-[10px] text-ink-dim">… {file.caseCount - file.cases.length} more</span>
        </TreeLeafLabel>
      ) : null}
    </>
  );
}
