'use client';

import type { ReactNode } from 'react';
import { groupByFolder } from './fileTree';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

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
    <div className="sticky top-0 z-10 flex bg-panel">
      <HoverCardTrigger label={folder} className="min-w-0 flex-1" focusable={false} tooltipStyle>
        <span dir="rtl" className="min-w-0 flex-1 truncate px-1.5 py-[1px] text-left text-[10px] leading-4 text-ink-dim opacity-50">
          <bdi dir="ltr">{folder}</bdi>
        </span>
      </HoverCardTrigger>
    </div>
  );
}
