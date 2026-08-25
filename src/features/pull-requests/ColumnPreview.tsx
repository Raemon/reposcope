'use client';

import { useColumnNav, type ColumnRow } from './columnNav';
import type { ColumnId } from './navColumn';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import type { RowState } from '@/features/surface-ui/rowState';

export interface PreviewToken {
  key: string;
  label: string;
  title: string;
  accent?: boolean;
}

const CHIP_TONE: Record<RowState, string> = {
  plain: 'bg-btn text-ink-dim',
  highlighted: 'bg-btn-hover text-ink outline outline-1 outline-ink',
  selected: 'bg-btn-active text-accent',
  both: 'bg-btn-both text-accent outline outline-1 outline-ink',
};

const CHIP = 'shrink-0 rounded-[3px] px-[3px] py-[2px] font-mono text-[9px] leading-none tracking-tight normal-case';

export function ColumnPreview({ tokens, column }: { tokens: PreviewToken[]; column: ColumnId }) {
  const nav = useColumnNav(column);
  if (tokens.length === 0) return null;
  return (
    <span className="flex min-h-0 flex-1 flex-col items-center gap-[3px] overflow-y-auto [mask-image:linear-gradient(to_bottom,black_calc(100%-20px),transparent)]">
      {tokens.map((token) => (
        <PreviewChip key={token.key} token={token} row={nav.row(token.key, token.accent ?? false)} />
      ))}
    </span>
  );
}

function PreviewChip({ token, row }: { token: PreviewToken; row: ColumnRow }) {
  return (
    <HoverCardTrigger label={token.title} focusable={false} tooltipStyle>
      <span
        data-nav-cursor={row.props.cursor || undefined}
        onPointerEnter={row.props.onPointerEnter}
        className={`${CHIP} ${CHIP_TONE[row.state]}`}
      >
        {token.label}
      </span>
    </HoverCardTrigger>
  );
}
