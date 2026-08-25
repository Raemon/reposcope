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

export function rowStateClass(state: RowState): string {
  return ROW_STATE_CLASS[state];
}
