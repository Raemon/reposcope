'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { memoryPref, usePref } from '@/features/pull-requests/localPref';

export interface Reveal {
  value: string;
  pathname: string;
  epoch: number;
}

export interface RevealChannel {
  request: (value: string, pathname: string) => void;
  useHeld: () => Reveal | null;
  clear: () => void;
}

function revealChannel(): RevealChannel {
  const pref = memoryPref<Reveal | null>(null);
  let epoch = 0;
  return {
    request: (value, pathname) => pref.set({ value, pathname, epoch: (epoch += 1) }),
    useHeld: () => usePref(pref),
    clear: () => pref.set(null),
  };
}

export const fileReveal = revealChannel();
export const commitReveal = revealChannel();

export function requestOnPage(channel: RevealChannel, route: string, value: string): boolean {
  const pathname = window.location.pathname;
  if (route.split('?')[0] !== pathname) return false;
  channel.request(value, pathname);
  return true;
}

export function useRevealFromParam(channel: RevealChannel, value: string | null): void {
  useEffect(() => {
    if (value !== null) channel.request(value, window.location.pathname);
  }, [channel, value]);
}

export function useReveal(channel: RevealChannel, ready: (value: string) => boolean, apply: (value: string) => void): void {
  const pathname = usePathname();
  const held = channel.useHeld();
  useEffect(() => {
    if (held === null || held.pathname !== window.location.pathname || !ready(held.value)) return;
    channel.clear();
    apply(held.value);
  }, [held, pathname, ready, apply, channel]);
}
