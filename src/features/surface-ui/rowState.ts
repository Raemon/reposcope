export type RowState = 'plain' | 'highlighted' | 'selected' | 'both';

const ROW_STATE_CLASS: Record<RowState, string> = {
  plain: 'text-ink',
  highlighted: 'bg-btn-hover text-ink',
  selected: 'bg-btn-active text-accent',
  both: 'bg-btn-both text-accent',
};

export function rowState(selected: boolean, highlighted: boolean): RowState {
  if (selected) return highlighted ? 'both' : 'selected';
  return highlighted ? 'highlighted' : 'plain';
}

export function rowShowsAccent(state: RowState): boolean {
  return state === 'selected' || state === 'both';
}

const SHEET_STATE_CLASS: Record<RowState, string> = {
  plain: 'text-ink',
  highlighted: 'bg-btn/60 text-ink',
  selected: 'text-accent shadow-[inset_2px_0_0_var(--accent)]',
  both: 'bg-btn/60 text-accent shadow-[inset_2px_0_0_var(--accent)]',
};

export function rowStateClass(state: RowState, sheet = false): string {
  return sheet ? SHEET_STATE_CLASS[state] : ROW_STATE_CLASS[state];
}
