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
