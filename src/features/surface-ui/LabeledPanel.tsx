import type { ReactNode } from 'react';
import { InsightPanel } from './InsightSection';

export function LabeledPanel({
  label,
  className = '',
  panelClassName = '',
  children,
}: {
  label: ReactNode;
  className?: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-dim">{label}</p>
      <InsightPanel className={panelClassName}>{children}</InsightPanel>
    </div>
  );
}
