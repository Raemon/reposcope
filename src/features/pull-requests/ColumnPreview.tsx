'use client';

const MAX_TOKENS = 60;

export interface PreviewToken {
  key: string;
  label: string;
  title: string;
  accent?: boolean;
}

export function ColumnPreview({ tokens }: { tokens: PreviewToken[] }) {
  if (tokens.length === 0) return null;
  return (
    <span className="flex min-h-0 flex-1 flex-col items-center gap-[3px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-20px),transparent)]">
      {tokens.slice(0, MAX_TOKENS).map((token) => (
        <span
          key={token.key}
          title={token.title}
          className={`shrink-0 rounded-[3px] px-[3px] py-[2px] font-mono text-[9px] leading-none tracking-tight normal-case ${
            token.accent ? 'bg-btn-active text-accent' : 'bg-btn-hover text-ink-dim'
          }`}
        >
          {token.label}
        </span>
      ))}
    </span>
  );
}
