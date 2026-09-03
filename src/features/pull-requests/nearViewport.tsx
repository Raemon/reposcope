'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Two screens of lead time, so a section is drawn well before it is scrolled to.
const LEAD_MARGIN = '200% 0px';

interface NearWatcher {
  watch: (node: Element, onNear: () => void) => () => void;
}

const NearViewport = createContext<NearWatcher | null>(null);

export function NearViewportProvider({ root, children }: { root: Element | null; children: ReactNode }) {
  return <NearViewport.Provider value={useNearWatcher(root)}>{children}</NearViewport.Provider>;
}

export function useNearViewport(node: Element | null): boolean {
  const watcher = useContext(NearViewport);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !watcher || !node) return;
    return watcher.watch(node, () => setNear(true));
  }, [watcher, node, near]);
  return near;
}

function useNearWatcher(root: Element | null): NearWatcher | null {
  const [held, setHeld] = useState<{ root: Element; watcher: NearWatcher } | null>(null);
  useEffect(() => {
    if (!root) return;
    const { watcher, stop } = startWatching(root);
    setHeld({ root, watcher });
    return stop;
  }, [root]);
  return held?.root === root ? held.watcher : null;
}

function startWatching(root: Element): { watcher: NearWatcher; stop: () => void } {
  const wanted = new Map<Element, () => void>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) wanted.get(entry.target)?.();
    },
    { root, rootMargin: LEAD_MARGIN },
  );
  return { watcher: { watch: watchWith(observer, wanted) }, stop: () => observer.disconnect() };
}

function watchWith(observer: IntersectionObserver, wanted: Map<Element, () => void>) {
  return (node: Element, onNear: () => void) => {
    wanted.set(node, onNear);
    observer.observe(node);
    return () => {
      wanted.delete(node);
      observer.unobserve(node);
    };
  };
}
