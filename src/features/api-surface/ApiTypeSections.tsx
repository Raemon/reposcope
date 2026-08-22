'use client';

import { useState } from 'react';
import { ApiTypeRow } from './ApiTypeRow';
import { TreeBranchLabel } from './TreeRowLabel';
import { RETURNED_SECTION_ID, type ApiTypeSection } from './apiTypeSectionTypes';

export function ApiTypeSections({ sections }: { sections: ApiTypeSection[] }) {
  return (
    <>
      {sections.map((section) => <SectionRows key={section.id} section={section} />)}
    </>
  );
}

function SectionRows({ section }: { section: ApiTypeSection }) {
  const [open, setOpen] = useState(section.id === RETURNED_SECTION_ID);
  return (
    <>
      <tr className="border-b border-panel-edge/70 bg-btn/18 last:border-b-0">
        <th scope="row" colSpan={2} className="h-7 whitespace-nowrap py-0 pl-2 pr-2.5 text-left font-normal">
          <TreeBranchLabel open={open} onToggle={() => setOpen((held) => !held)} depth={0} label={section.title}>
            <span className="text-[11px] text-ink">{section.title}</span>
            <span className="font-mono text-[10px] text-ink-dim">{section.entries.length}</span>
          </TreeBranchLabel>
        </th>
      </tr>
      {open
        ? section.entries.map((entry) => (
          <ApiTypeRow key={`${entry.file}:${entry.line}:${entry.name}`} entry={entry} returnedBy={entry.returnedBy} />
        ))
        : null}
    </>
  );
}
