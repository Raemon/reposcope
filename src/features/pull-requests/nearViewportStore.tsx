'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Two screens of lead time, so a section is drawn well before it is scrolled to.
const LEAD_MARGIN = '200% 0px';

type NearRef = (node: Element | null) => (() => void) | undefined;

interface NearWatcher {
  watch: (node: Element, onNear: () => void) => () => void;
}

const NearViewportContext = createContext<NearWatcher | null>(null);

export function NearViewportProvider({ root, children }: { root: Element | null; children: ReactNode }) {
  const watcher = useNearWatcher(root);
  return <NearViewportContext value={watcher}>{children}</NearViewportContext>;
}

/** Attach the ref to an element to learn, once, that it has come near the scroller. */
export function useNearViewport(): [NearRef, boolean] {
  const watcher = useContext(NearViewportContext);
  const [near, setNear] = useState(false);
  const attach = useCallback<NearRef>(
    (node) => (node && watcher ? watcher.watch(node, () => setNear(true)) : undefined),
    [watcher],
  );
  return [attach, near];
}

function useNearWatcher(root: Element | null): NearWatcher | null {
  const [held, setHeld] = useState<{ root: Element; watcher: NearWatcher } | null>(null);
  useEffect(() => {
    if (!root) return;
    const { watcher, stop } = startWatching(root);
    setHeld({ root, watcher });
    return stop;
  }, [root]);
  return watcherFor(held, root);
}

function watcherFor(held: { root: Element; watcher: NearWatcher } | null, root: Element | null): NearWatcher | null {
  return held && held.root === root ? held.watcher : null;
}

function startWatching(root: Element): { watcher: NearWatcher; stop: () => void } {
  const wanted = new Map<Element, () => void>();
  const observer = new IntersectionObserver((entries) => announceNear(observer, entries, wanted), {
    root,
    rootMargin: LEAD_MARGIN,
  });
  return { watcher: { watch: watchWith(observer, wanted) }, stop: () => observer.disconnect() };
}

function watchWith(observer: IntersectionObserver, wanted: Map<Element, () => void>) {
  return (node: Element, onNear: () => void) => {
    wanted.set(node, onNear);
    observer.observe(node);
    return () => forget(observer, wanted, node);
  };
}

// Coming near is a one-way door, so an element is told once and then dropped.
function announceNear(observer: IntersectionObserver, entries: IntersectionObserverEntry[], wanted: Map<Element, () => void>) {
  for (const entry of entries.filter((seen) => seen.isIntersecting)) {
    const onNear = wanted.get(entry.target);
    forget(observer, wanted, entry.target);
    onNear?.();
  }
}

function forget(observer: IntersectionObserver, wanted: Map<Element, () => void>, node: Element) {
  wanted.delete(node);
  observer.unobserve(node);
}
