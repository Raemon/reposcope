const BUTTON_SHAPE =
  'rounded bg-btn uppercase tracking-[0.18em] hover:bg-btn-hover disabled:opacity-40 disabled:hover:bg-btn';

const CHOICE_SIZE = 'px-2 py-1 text-[10px]';

export const BUTTON = `${BUTTON_SHAPE} text-ink-dim hover:text-ink disabled:hover:text-ink-dim`;

export const CHOICE = `${BUTTON} ${CHOICE_SIZE}`;

export const ACCENT_CHOICE = `${BUTTON_SHAPE} ${CHOICE_SIZE} text-accent hover:text-ink disabled:hover:text-accent`;

export const TEXT_ACTION = 'rounded text-ink-dim hover:bg-btn-hover hover:text-ink';

const ICON_BUTTON = 'flex items-center justify-center rounded';

export type IconButtonTone = 'accent' | 'add';

const TONES: Record<IconButtonTone, { active: string; idle: string }> = {
  accent: { active: 'text-accent', idle: 'text-ink-dim hover:text-ink' },
  add: { active: 'text-add-ink', idle: 'text-add-ink/45 hover:text-add-ink' },
};

export const iconButtonClass = (active: boolean, tone: IconButtonTone = 'accent') =>
  `${ICON_BUTTON} ${active ? TONES[tone].active : TONES[tone].idle}`;
