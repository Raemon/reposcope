'use client';

import { ChangeCounts } from './ChangeCounts';
import { useColumnNav } from './columnNav';
import { fileKindColor, splitExtension } from './fileKind';
import { baseName, groupByFolder } from './fileTree';
import type { ChangedFile } from './pullRequests';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { rowShowsAccent, rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

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
  const nav = useColumnNav('files');
  return (
    <>
      {groupByFolder(files).map((group) => (
        <div key={group.folder}>
          <FolderLabel folder={group.folder} />
          {group.files.map((file) => {
            const row = nav.row(file.filename, file.filename === selected);
            return (
              <HoverCardTrigger key={file.filename} label={file.filename} className="flex w-full" focusable={false} tooltipStyle>
                <SelectableRow
                  {...row.props}
                  onActivate={() => onSelect(file.filename)}
                  className={`${ROW} ${group.folder ? 'pl-4' : 'pl-1.5'} ${rowStateClass(row.state)}`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <FileName path={file.filename} tinted={!rowShowsAccent(row.state)} />
                  </span>
                  <ChangeCounts additions={file.additions} deletions={file.deletions} />
                </SelectableRow>
              </HoverCardTrigger>
            );
          })}
        </div>
      ))}
    </>
  );
}

function FileName({ path, tinted }: { path: string; tinted: boolean }) {
  const [stem, extension] = splitExtension(baseName(path));
  const color = tinted ? fileKindColor(path) : undefined;
  return (
    <>
      {stem}
      <span style={color ? { color } : undefined}>{extension}</span>
    </>
  );
}

function FolderLabel({ folder }: { folder: string }) {
  if (!folder) return null;
  return (
    <HoverCardTrigger label={folder} className="flex min-w-0 w-full" focusable={false} tooltipStyle>
      <p dir="rtl" className="truncate px-1.5 py-[1px] text-left text-[10px] leading-4 text-ink-dim opacity-50">
        {folder}
      </p>
    </HoverCardTrigger>
  );
}
