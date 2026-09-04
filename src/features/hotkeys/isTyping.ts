const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}
