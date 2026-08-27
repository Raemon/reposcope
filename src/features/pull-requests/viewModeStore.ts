'use client';

import { createLocalSetting } from '@/features/surface-ui/localSetting';

export type ViewMode = 'columns' | 'central';

const viewMode = createLocalSetting<ViewMode>({
  key: 'reposcope.viewMode',
  values: ['columns', 'central'],
  fallback: () => 'columns',
  serverValue: 'columns',
});

export const setViewMode = viewMode.set;
export const useViewMode = viewMode.use;
