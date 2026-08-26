'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export function useWrappedText<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [wrapped, setWrapped] = useState(false);
  useEffect(() => {
    const text = ref.current;
    if (!text) return;
    const row = rowBox(text);
    let width = row.clientWidth;
    const measure = () => setWrapped(text.getClientRects().length > 1);
    measure();
    const observer = new ResizeObserver(() => {
      if (row.clientWidth === width) return;
      width = row.clientWidth;
      measure();
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);
  return [ref, wrapped];
}

// Re-measuring on the row's own height change would undo the wrap that caused it, forever.
function rowBox(text: HTMLElement): HTMLElement {
  return text.parentElement?.parentElement ?? text.parentElement ?? text;
}
