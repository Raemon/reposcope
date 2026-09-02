'use client';

import { useState } from 'react';

const LINE = 'px-2 py-1 text-[11px]';

export function ReviewLoadNotice({ label, error, reload }: { label: string; error: string | null; reload: () => Promise<unknown> }) {
  if (error === null) return <p className={`${LINE} text-ink-dim`}>Loading {label}…</p>;
  return (
    <p className={`${LINE} text-error-ink`}>
      {error} <RetryButton reload={reload} />
    </p>
  );
}

function RetryButton({ reload }: { reload: () => Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    setRetrying(true);
    void reload().catch(() => {}).finally(() => setRetrying(false));
  };
  return (
    <button type="button" onClick={retry} disabled={retrying} className="underline disabled:opacity-40">
      {retrying ? 'retrying…' : 'try again'}
    </button>
  );
}
