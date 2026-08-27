'use client';

import { localPref, usePref } from './localPref';

export type CentralTab = 'pulls' | 'discussion' | 'commits' | 'files';

const TABS: CentralTab[] = ['pulls', 'discussion', 'commits', 'files'];

const tabPref = localPref<CentralTab>('reposcope.centralTab', 'files', decodeTab);

export function setCentralTab(tab: CentralTab): void {
  tabPref.set(tab);
}

export function useCentralTab(): CentralTab {
  return usePref(tabPref);
}

function decodeTab(stored: unknown): CentralTab | undefined {
  return TABS.find((tab) => tab === stored);
}
