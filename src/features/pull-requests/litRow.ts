import type { MouseEvent } from 'react';

export const FILE_DIFF_ATTR = 'data-file-diff';
export const ROW_ATTR = 'data-row';
const LIT = 'diff-line-lit';

export function lightRow(from: HTMLElement, row: number | null): void {
  const file = from.closest(`[${FILE_DIFF_ATTR}]`);
  if (!file) return;
  for (const line of file.querySelectorAll(`.${LIT}`)) line.classList.remove(LIT);
  if (row === null) return;
  for (const line of file.querySelectorAll(`[${ROW_ATTR}="${row}"]`)) line.classList.add(LIT);
}

export function rowLighting(row: number) {
  return {
    onMouseEnter: (event: MouseEvent<HTMLElement>) => lightRow(event.currentTarget, row),
    onMouseLeave: (event: MouseEvent<HTMLElement>) => lightRow(event.currentTarget, null),
  };
}
