'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export function useWrappedText<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [wrapped, setWrapped] = useState(false);
  useEffect(() => {
    const text = ref.current;
    if (!text) return;
    const measure = () => setWrapped(text.getClientRects().length > 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text.parentElement ?? text);
    return () => observer.disconnect();
  }, []);
  return [ref, wrapped];
}
