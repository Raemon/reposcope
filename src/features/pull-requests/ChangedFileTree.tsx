'use client';

import { ChangeCounts } from './ChangeCounts';
import { baseName, groupByFolder } from './fileTree';
import type { ChangedFile } from './pullRequests';

const ROW = 'flex w-full items-baseline gap-1.5 py-[1px] pr-1.5 text-left text-[11px] leading-4';

export function ChangedFileTree({
  files,
  selected,
  onSelect,
}: {
  files: ChangedFile[];
  selected: string | null;
  onSelect: (filename: string) => void;
}) {
  return (
    <>
      {groupByFolder(files).map((group) => (
        <div key={group.folder}>
          {group.folder && (
            <p dir="rtl" title={group.folder} className="truncate px-1.5 py-[1px] text-left text-[10px] leading-4 text-ink-dim">
              {group.folder}
            </p>
          )}
          {group.files.map((file) => (
            <button
              key={file.filename}
              type="button"
              onClick={() => onSelect(file.filename)}
              title={file.filename}
              className={`${ROW} ${group.folder ? 'pl-4' : 'pl-1.5'} ${
                file.filename === selected ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{baseName(file.filename)}</span>
              <ChangeCounts additions={file.additions} deletions={file.deletions} />
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
