'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const GAP = 10;
const VIEWPORT_MARGIN = 8;

interface TipPosition {
  left: number;
  top: number;
}

type TipPlacement = 'side' | 'below';

const CARD_WIDTHS = { default: 'max-w-[min(34rem,calc(100vw-1rem))]', wide: 'max-w-[min(56rem,calc(100vw-1rem))]' };
type TipWidth = keyof typeof CARD_WIDTHS;
const POPPER_BASE = 'fixed z-50 w-max overflow-hidden';
const CARD_POPPER = 'min-w-64 rounded-md bg-tip shadow-card';
const TOOLTIP_POPPER = 'rounded bg-tooltip-bg text-tooltip-ink pointer-events-none';
const CARD_LABEL = 'truncate border-b border-panel-edge px-3 py-2 text-accent';
const TOOLTIP_LABEL = 'truncate px-2 py-1';

function labelClass(tooltipStyle: boolean, serif: boolean): string {
  const shell = tooltipStyle ? TOOLTIP_LABEL : CARD_LABEL;
  if (serif) return `${shell} font-serif ${tooltipStyle ? 'text-[11px]' : 'text-[12px]'}`;
  return `${shell} font-mono ${tooltipStyle ? 'text-[10px]' : 'text-[11px]'}`;
}

const OFFSCREEN: TipPosition = { left: -9999, top: -9999 };
const HOVER_INTENT_MS = 500;
const HOVER_GRACE_MS = 220;
const HOVERCARD_ATTRIBUTE = 'data-hovercard';

export function HoverCardTrigger({
  label,
  card,
  children,
  className = '',
  placement = 'side',
  interactive = true,
  width = 'default',
  focusable = true,
  tooltipStyle = false,
  serifLabel = false,
}: {
  label: string;
  card?: ReactNode;
  children: ReactNode;
  className?: string;
  placement?: TipPlacement;
  interactive?: boolean;
  width?: TipWidth;
  focusable?: boolean;
  tooltipStyle?: boolean;
  serifLabel?: boolean;
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

  const leave = card && interactive ? scheduleHide : hide;

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
      tabIndex={focusable ? 0 : undefined}
      className={`inline-flex outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      aria-describedby={anchor ? id : undefined}
      onMouseEnter={(event) => show(event.currentTarget.getBoundingClientRect())}
      onMouseLeave={leave}
      onFocus={(event) => {
        if (event.target instanceof HTMLElement) event.target.setAttribute('aria-describedby', id);
        show(event.currentTarget.getBoundingClientRect());
      }}
      onBlur={(event) => {
        if (event.target instanceof HTMLElement) event.target.removeAttribute('aria-describedby');
        leave();
      }}
    >
      {children}
      {anchor ? (
        <HoverCardPopper
          ref={popper}
          id={id}
          label={label}
          anchor={anchor}
          placement={placement}
          width={width}
          tooltipStyle={tooltipStyle}
          serifLabel={serifLabel}
          reachable={reachable && interactive}
          onEnter={clearTimers}
          onLeave={leave}
        >
          {card}
        </HoverCardPopper>
      ) : null}
    </span>
  );
}

export function HoverCardHtml({ html, className, tooltipStyle = false }: { html: string; className: string; tooltipStyle?: boolean }) {
  const id = useId();
  const popper = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<{ label: string; anchor: DOMRect } | null>(null);
  const hide = useCallback(() => {
    active.current?.removeAttribute('aria-describedby');
    active.current = null;
    setTip(null);
  }, []);
  const show = (container: HTMLElement, target: EventTarget | null) => {
    const trigger = target instanceof Element ? target.closest<HTMLElement>(`[${HOVERCARD_ATTRIBUTE}]`) : null;
    if (!trigger || !container.contains(trigger)) return hide();
    active.current?.removeAttribute('aria-describedby');
    trigger.setAttribute('aria-describedby', id);
    active.current = trigger;
    setTip({ label: trigger.getAttribute(HOVERCARD_ATTRIBUTE) ?? '', anchor: trigger.getBoundingClientRect() });
  };
  const leaveFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) hide();
  };
  useEffect(() => {
    const hideOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', hideOnEscape);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', hideOnEscape);
      active.current?.removeAttribute('aria-describedby');
    };
  }, [hide]);
  return (
    <div
      onMouseOver={(event: MouseEvent<HTMLDivElement>) => show(event.currentTarget, event.target)}
      onMouseLeave={hide}
      onFocus={(event) => show(event.currentTarget, event.target)}
      onBlur={leaveFocus}
    >
      <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
      {tip ? <HoverCardPopper ref={popper} id={id} label={tip.label} anchor={tip.anchor} placement="side" width="default" tooltipStyle={tooltipStyle} reachable={false} onEnter={hide} onLeave={hide} /> : null}
    </div>
  );
}

function HoverCardPopper({
  ref,
  id,
  label,
  anchor,
  placement,
  width,
  tooltipStyle,
  serifLabel = false,
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
  width: TipWidth;
  tooltipStyle: boolean;
  serifLabel?: boolean;
  reachable: boolean;
  onEnter: () => void;
  onLeave: () => void;
  children?: ReactNode;
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
      className={`${POPPER_BASE} ${CARD_WIDTHS[width]} ${tooltipStyle ? TOOLTIP_POPPER : `${CARD_POPPER} ${reachable ? '' : 'pointer-events-none'}`}`}
    >
      <div className={labelClass(tooltipStyle, serifLabel)}>{label}</div>
      {children !== undefined ? <div className="max-h-[65vh] overflow-y-auto px-3 py-2">{children}</div> : null}
    </div>,
    document.body,
  );
}

function floatingTipPosition(tip: DOMRect, anchor: DOMRect, placement: TipPlacement): TipPosition {
  if (placement === 'below') {
    return {
      left: Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, window.innerWidth - tip.width - VIEWPORT_MARGIN)),
      top: clampedTop(anchor.bottom + GAP, tip.height),
    };
  }
  return { left: horizontalPosition(anchor, tip.width), top: clampedTop(anchor.top, tip.height) };
}

function horizontalPosition(anchor: DOMRect, tipWidth: number): number {
  const rightOfAnchor = anchor.right + GAP;
  if (rightOfAnchor + tipWidth <= window.innerWidth - VIEWPORT_MARGIN) return rightOfAnchor;
  return Math.max(VIEWPORT_MARGIN, anchor.left - GAP - tipWidth);
}

function clampedTop(preferredTop: number, tipHeight: number): number {
  const lowestAllowed = window.innerHeight - tipHeight - VIEWPORT_MARGIN;
  return Math.max(VIEWPORT_MARGIN, Math.min(Math.max(preferredTop, VIEWPORT_MARGIN), lowestAllowed));
}
