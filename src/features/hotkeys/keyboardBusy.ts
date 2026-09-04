const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const OVERLAY_OPEN = 'dialog[open], [role="dialog"][aria-modal="true"], [aria-haspopup="menu"][aria-expanded="true"]';

export function keyboardBusy(event: KeyboardEvent): boolean {
  return isTyping(event.target) || document.querySelector(OVERLAY_OPEN) !== null;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}
