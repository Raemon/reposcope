'use client';

import { memoryPref, usePref } from '@/features/pull-requests/localPref';

export interface PaletteState {
  open: boolean;
  seed: string;
  epoch: number;
}

const palette = memoryPref<PaletteState>({ open: false, seed: '', epoch: 0 });

export function openPalette(seed = ''): void {
  const held = palette.read();
  palette.set({ open: true, seed, epoch: held.epoch + 1 });
}

export function closePalette(): void {
  const held = palette.read();
  if (held.open) palette.set({ ...held, open: false });
}

export function usePaletteState(): PaletteState {
  return usePref(palette);
}
