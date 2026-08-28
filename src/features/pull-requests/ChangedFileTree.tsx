'use client';

import { ChangeCounts } from './ChangeCounts';
import { useColumnNav } from './columnNav';
import { useDiffSort } from './diffSortStore';
import { fileKindColor, splitExtension } from './fileKind';
import { baseName, folderOf, groupByFolder } from './fileTree';
import type { ChangedFile } from './pullRequests';
import { rowShowsAccent, rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1.5 py-[1px] pr-1.5 text-left text-[11px] leading-4';

interface TreeProps {
  files: ChangedFile[];
  selected: string | null;
  onSelect: (filename: string) => void;
}

export function ChangedFileTree(props: TreeProps) {
  const grouped = useDiffSort() === 'folder';
  return grouped ? <GroupedRows {...props} /> : <FlatRows {...props} />;
}

function GroupedRows({ files, selected, onSelect }: TreeProps) {
  const nav = useColumnNav('files');
  return (
    <>
      {groupByFolder(files).map((group) => (
        <div key={group.folder}>
          <FolderLabel folder={group.folder} />
          {group.files.map((file) => (
            <FileRow key={file.filename} nav={nav} file={file} selected={selected} onSelect={onSelect} indented={group.folder !== ''} />
          ))}
        </div>
      ))}
    </>
  );
}

function FlatRows({ files, selected, onSelect }: TreeProps) {
  const nav = useColumnNav('files');
  return (
    <>
      {files.map((file) => (
        <FileRow key={file.filename} nav={nav} file={file} selected={selected} onSelect={onSelect} indented={false} withParent />
      ))}
    </>
  );
}

function FileRow({
  nav,
  file,
  selected,
  onSelect,
  indented,
  withParent = false,
}: {
  nav: ReturnType<typeof useColumnNav>;
  file: ChangedFile;
  selected: string | null;
  onSelect: (filename: string) => void;
  indented: boolean;
  withParent?: boolean;
}) {
  const row = nav.row(file.filename, file.filename === selected);
  return (
    <SelectableRow
      {...row.props}
      onActivate={() => onSelect(file.filename)}
      className={`${ROW} ${indented ? 'pl-4' : 'pl-1.5'} ${rowStateClass(row.state)}`}
    >
      <span className="min-w-0 flex-1 truncate">
        {withParent && <ParentFolder path={file.filename} />}
        <FileName path={file.filename} tinted={!rowShowsAccent(row.state)} />
      </span>
      <ChangeCounts additions={file.additions} deletions={file.deletions} />
    </SelectableRow>
  );
}

function ParentFolder({ path }: { path: string }) {
  const parent = baseName(folderOf(path));
  if (!parent) return null;
  return <span className="text-ink-dim opacity-50">{parent}/</span>;
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
    <p dir="rtl" className="truncate px-1.5 py-[1px] text-left text-[10px] leading-4 text-ink-dim opacity-50">
      {folder}
    </p>
  );
}
