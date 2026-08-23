'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const GAP = 10;
const VIEWPORT_MARGIN = 8;

interface TipPosition {
  left: number;
  top: number;
}

export type TipPlacement = 'side' | 'below';

const OFFSCREEN: TipPosition = { left: -9999, top: -9999 };
const HOVER_INTENT_MS = 500;
const HOVER_GRACE_MS = 220;

export function HoverCardTrigger({
  label,
  card,
  children,
  className = '',
  placement = 'side',
  interactive = true,
}: {
  label: string;
  card: ReactNode;
  children: ReactNode;
  className?: string;
  placement?: TipPlacement;
  interactive?: boolean;
}) {
  const id = useId();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [reachable, setReachable] = useState(false);
  const popper = useRef<HTMLDivElement>(null);
  const timers = useRef<{ hide?: ReturnType<typeof setTimeout>; reach?: ReturnType<typeof setTimeout> }>({});

  const clearTimers = useCallback(() => {
    clearTimeout(timers.current.hide);
    clearTimeout(timers.current.reach);
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    setAnchor(null);
    setReachable(false);
  }, [clearTimers]);

  const show = useCallback((rect: DOMRect) => {
    clearTimers();
    setAnchor(rect);
    timers.current.reach = setTimeout(() => setReachable(true), HOVER_INTENT_MS);
  }, [clearTimers]);

  const scheduleHide = useCallback(() => {
    clearTimeout(timers.current.reach);
    clearTimeout(timers.current.hide);
    timers.current.hide = setTimeout(hide, HOVER_GRACE_MS);
  }, [hide]);

  useEffect(() => {
    const hideOnScroll = (event: Event) => {
      if (popper.current?.contains(event.target as Node)) return;
      hide();
    };
    const hideOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    window.addEventListener('scroll', hideOnScroll, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', hideOnEscape);
    return () => {
      window.removeEventListener('scroll', hideOnScroll, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', hideOnEscape);
      clearTimers();
    };
  }, [clearTimers, hide]);

  return (
    <span
      tabIndex={0}
      className={`inline-flex outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      aria-describedby={anchor ? id : undefined}
      onMouseEnter={(event) => show(event.currentTarget.getBoundingClientRect())}
      onMouseLeave={scheduleHide}
      onFocus={(event) => show(event.currentTarget.getBoundingClientRect())}
      onBlur={scheduleHide}
    >
      {children}
      {anchor ? (
        <HoverCardPopper
          ref={popper}
          id={id}
          label={label}
          anchor={anchor}
          placement={placement}
          reachable={reachable && interactive}
          onEnter={clearTimers}
          onLeave={scheduleHide}
        >
          {card}
        </HoverCardPopper>
      ) : null}
    </span>
  );
}

function HoverCardPopper({
  ref,
  id,
  label,
  anchor,
  placement,
  reachable,
  onEnter,
  onLeave,
  children,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  id: string;
  label: string;
  anchor: DOMRect;
  placement: TipPlacement;
  reachable: boolean;
  onEnter: () => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<TipPosition>(OFFSCREEN);

  useLayoutEffect(() => {
    if (ref.current) setPosition(floatingTipPosition(ref.current.getBoundingClientRect(), anchor, placement));
  }, [anchor, placement, ref]);

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      style={position}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`fixed z-50 w-max min-w-64 max-w-[min(34rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-btn-edge bg-tip shadow-card ${reachable ? '' : 'pointer-events-none'}`}
    >
      <div className="truncate border-b border-btn-edge px-3 py-2 font-mono text-[11px] text-accent">{label}</div>
      <div className="max-h-[65vh] overflow-y-auto px-3 py-2">{children}</div>
    </div>,
    document.body,
  );
}

function floatingTipPosition(tip: DOMRect, anchor: DOMRect, placement: TipPlacement): TipPosition {
  if (placement === 'below') {
    return {
      left: Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, window.innerWidth - tip.width - VIEWPORT_MARGIN)),
      top: Math.min(anchor.bottom + GAP, window.innerHeight - tip.height - VIEWPORT_MARGIN),
    };
  }
  return { left: horizontalPosition(anchor, tip.width), top: verticalPosition(anchor, tip.height) };
}

function horizontalPosition(anchor: DOMRect, tipWidth: number): number {
  const rightOfAnchor = anchor.right + GAP;
  if (rightOfAnchor + tipWidth <= window.innerWidth - VIEWPORT_MARGIN) return rightOfAnchor;
  return Math.max(VIEWPORT_MARGIN, anchor.left - GAP - tipWidth);
}

function verticalPosition(anchor: DOMRect, tipHeight: number): number {
  const lowestAllowed = window.innerHeight - tipHeight - VIEWPORT_MARGIN;
  return Math.min(Math.max(anchor.top, VIEWPORT_MARGIN), lowestAllowed);
}
