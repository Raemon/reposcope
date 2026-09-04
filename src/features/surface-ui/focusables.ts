export const ARROW_STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';

export function focusableItems(root: HTMLElement | null): HTMLElement[] {
  return Array.from(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
}

export function focusFirstItem(root: HTMLElement | null): void {
  focusableItems(root)[0]?.focus();
}

export function holdsFocus(root: HTMLElement | null): boolean {
  return root !== null && root.contains(document.activeElement);
}

export function holdsKeyboardFocus(root: HTMLElement | null): boolean {
  return holdsFocus(root) && focusVisible(document.activeElement);
}

function focusVisible(node: Element | null): boolean {
  try {
    return node !== null && node.matches(':focus-visible');
  } catch {
    return true; // no :focus-visible support: fall back to always returning focus
  }
}
