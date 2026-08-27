'use client';

import { ChangeCounts } from './ChangeCounts';
import { useSheetRows } from './centralLayout';
import { useColumnNav } from './columnNav';
import { fileKindColor, splitExtension } from './fileKind';
import { baseName, groupByFolder } from './fileTree';
import type { ChangedFile } from './pullRequests';
import { rowShowsAccent, rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1.5 py-[1px] pr-1.5 text-left text-[11px] leading-4';
const SHEET_ROW = 'flex w-full items-baseline gap-2 py-1 pr-5 text-left text-row';

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
  const wide = useSheetRows();
  return (
    <>
      {groupByFolder(files).map((group) => (
        <div key={group.folder}>
          <FolderLabel folder={group.folder} wide={wide} />
          {group.files.map((file) => {
            const row = nav.row(file.filename, file.filename === selected);
            return (
              <SelectableRow
                key={file.filename}
                {...row.props}
                onActivate={() => onSelect(file.filename)}
                className={`${wide ? SHEET_ROW : ROW} ${indentOf(wide, group.folder)} ${rowStateClass(row.state, wide)}`}
              >
                <span className="min-w-0 flex-1 truncate">
                  <FileName path={file.filename} tinted={!rowShowsAccent(row.state)} />
                </span>
                <ChangeCounts additions={file.additions} deletions={file.deletions} />
              </SelectableRow>
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

function indentOf(wide: boolean, folder: string): string {
  if (!wide) return folder ? 'pl-4' : 'pl-1.5';
  return folder ? 'pl-9' : 'pl-5';
}

function FolderLabel({ folder, wide }: { folder: string; wide: boolean }) {
  if (!folder) return null;
  return (
    <p dir="rtl" className={`truncate py-[1px] text-left text-meta text-ink-dim opacity-60 ${wide ? 'px-5 pt-2' : 'px-1.5'}`}>
      {folder}
    </p>
  );
}
