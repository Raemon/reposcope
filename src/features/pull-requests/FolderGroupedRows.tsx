'use client';

import type { ReactNode } from 'react';
import { groupByFolder } from './fileTree';

export function FolderGroupedRows<T>({
  items,
  pathOf,
  children,
}: {
  items: T[];
  pathOf: (item: T) => string;
  children: (item: T, indented: boolean) => ReactNode;
}) {
  return (
    <>
      {groupByFolder(items, pathOf).map((group) => (
        <div key={group.folder}>
          <FolderLabel folder={group.folder} />
          {group.items.map((item) => children(item, group.folder !== ''))}
        </div>
      ))}
    </>
  );
}

function FolderLabel({ folder }: { folder: string }) {
  if (!folder) return null;
  return (
    <p dir="rtl" className="truncate px-1.5 py-[1px] text-left text-[10px] leading-4 text-ink-dim opacity-50">
      <bdi dir="ltr">{folder}</bdi>
    </p>
  );
}
