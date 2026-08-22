const GAP = 10;
const VIEWPORT_MARGIN = 8;

export interface TipPosition {
  left: number;
  top: number;
}

export function floatingTipPosition(tip: DOMRect, anchor: DOMRect): TipPosition {
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
