'use client';

import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 30_000;
const FOREGROUND_GAP_MS = 10_000;

export function usePollWhileVisible(refresh: () => Promise<unknown>, active: boolean): void {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => (active ? startPolling(() => latest.current()) : undefined), [active]);
}

function startPolling(refresh: () => Promise<unknown>): () => void {
  let polledAt = Date.now();
  const poll = () => {
    polledAt = Date.now();
    void refresh().catch(() => {});
  };
  const onTick = () => {
    if (foreground()) poll();
  };
  const onForeground = () => {
    if (foreground() && Date.now() - polledAt >= FOREGROUND_GAP_MS) poll();
  };
  return listenWhileForeground(onTick, onForeground);
}

function listenWhileForeground(onTick: () => void, onForeground: () => void): () => void {
  const timer = setInterval(onTick, POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
  };
}

function foreground(): boolean {
  return document.visibilityState === 'visible';
}
