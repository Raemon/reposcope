'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useCodeHoverShown, type HoverShown } from './codeHoverStore';
import { floatingTipPosition } from '@/features/surface-ui/HoverCard';

const OFFSCREEN: CSSProperties = { left: -9999, top: -9999 };
const POINTER_HEIGHT = 16;

export function CodeHoverCard() {
  const shown = useCodeHoverShown();
  if (!shown) return null;
  return createPortal(<HoverPopper shown={shown} />, document.body);
}

function HoverPopper({ shown }: { shown: HoverShown }) {
  const card = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>(OFFSCREEN);
  useLayoutEffect(() => {
    if (!card.current) return;
    const pointer = new DOMRect(shown.anchor.x, shown.anchor.y, 0, POINTER_HEIGHT);
    setStyle(floatingTipPosition(card.current.getBoundingClientRect(), pointer, 'below'));
  }, [shown]);
  return (
    <div
      ref={card}
      role="tooltip"
      style={style}
      className="pointer-events-none fixed z-50 max-w-[min(40rem,calc(100vw-1rem))] overflow-hidden rounded-md bg-tip shadow-card"
    >
      <pre className="diff-code whitespace-pre-wrap px-3 py-2 text-[11px] text-ink">{shown.info.signature}</pre>
      {shown.info.docs && (
        <p className="whitespace-pre-wrap border-t border-panel-edge px-3 py-2 font-sans text-[11px] text-ink-dim">{shown.info.docs}</p>
      )}
    </div>
  );
}
