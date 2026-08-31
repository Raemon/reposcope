export const BUTTON =
  'rounded bg-btn uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-btn disabled:hover:text-ink-dim';

export const CHOICE = `${BUTTON} px-2 py-1 text-[10px]`;

const ICON_BUTTON = 'flex items-center justify-center rounded';

export const iconButtonClass = (active: boolean) =>
  `${ICON_BUTTON} ${active ? 'text-accent' : 'text-ink-dim hover:text-ink'}`;
