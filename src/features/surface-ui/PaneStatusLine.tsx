'use client';

import type { ReactNode } from 'react';

const TONE = { dim: 'text-ink-dim', error: 'text-error-ink' };

export function PaneStatusLine({
  tone,
  onRetry,
  className = '',
  children,
}: {
  tone: 'dim' | 'error';
  onRetry?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={`px-2 py-1 text-[11px] leading-4 ${TONE[tone]} ${className}`}>
      {children}
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-2 underline">
          try again
        </button>
      )}
    </p>
  );
}

export function retryHandler(reload: () => Promise<unknown>): () => void {
  return () => void reload().catch(() => {});
}
