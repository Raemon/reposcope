'use client';

import { setStickyColumn } from './stickyColumns';

export type PullListColumnName = 'pulls' | 'all-pulls';

const KEEPS_LIST_OPEN = '(min-width: 1800px)';

export function collapsePullList(name: PullListColumnName): void {
  if (window.matchMedia(KEEPS_LIST_OPEN).matches) return;
  setStickyColumn(name, (held) => ({ ...held, open: false }));
}
