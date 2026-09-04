import type { ReadingItem } from './fileTreeNodes';

export interface FolderHeading {
  path: string;
  depth: number;
}

export function FolderHeadingBar({ path, depth }: FolderHeading) {
  const size = depth === 0 ? 'py-4 text-[22px]' : 'py-3 text-[17px]';
  return (
    <h2 className={`border-b border-panel-edge bg-shade px-3 font-serif leading-tight text-ink ${size}`}>
      {path}/
    </h2>
  );
}

export function headingsBefore(items: ReadingItem[], shown: ReadonlySet<string>): ReadonlyMap<string, FolderHeading[]> {
  const before = new Map<string, FolderHeading[]>();
  let pending: FolderHeading[] = [];
  for (const item of items) {
    if (item.kind === 'folder') pending.push({ path: item.path, depth: item.depth });
    else if (shown.has(item.path)) {
      before.set(item.path, pending);
      pending = [];
    }
  }
  return before;
}
