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
  onRetry?: () => void | Promise<unknown>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={`px-2 py-1 text-[11px] leading-4 ${TONE[tone]} ${className}`}>
      {children}
      {onRetry && (
        <button type="button" onClick={retryClick(onRetry)} className="ml-2 underline">
          try again
        </button>
      )}
    </p>
  );
}

// A failed retry leaves the error already on screen; catching only avoids console noise.
function retryClick(onRetry: () => void | Promise<unknown>): () => void {
  return () => void Promise.resolve(onRetry()).catch(() => {});
}
