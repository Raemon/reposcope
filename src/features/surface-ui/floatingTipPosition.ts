const GAP = 10;
const VIEWPORT_MARGIN = 8;

export interface TipPosition {
  left: number;
  top: number;
}

export type TipPlacement = 'side' | 'below';

export function floatingTipPosition(tip: DOMRect, anchor: DOMRect, placement: TipPlacement = 'side'): TipPosition {
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
