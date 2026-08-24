import type { ReactNode } from 'react';

export function InsightSection({
  id,
  kicker,
  title,
  blurb,
  stat,
  as: Heading = 'h2',
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  blurb: string;
  stat?: string;
  as?: 'h1' | 'h2';
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0">
      <div className="mb-3 max-w-[22rem] border-b border-panel-edge pb-3">
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">{kicker}</p>
        <Heading id={`${id}-heading`} className="text-xl text-accent">{title}</Heading>
        <p className="mt-1 text-xs leading-5 text-ink-dim">{blurb}</p>
        {stat ? <p className="mt-2 font-mono text-[11px] text-ink-dim">{stat}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function InsightPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-fit max-w-full overflow-x-auto rounded bg-panel ${className}`}>
      {children}
    </div>
  );
}
