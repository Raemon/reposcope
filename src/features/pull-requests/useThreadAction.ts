'use client';

import { useState } from 'react';
import { errorMessage } from '@/features/sources/errorMessage';

export interface ThreadAction {
  busy: boolean;
  failure: string | null;
  run: (work: () => Promise<unknown>) => void;
}

export function useThreadAction(reload: () => Promise<unknown>): ThreadAction {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const run = (work: () => Promise<unknown>) => {
    setBusy(true);
    setFailure(null);
    void work()
      .then(reload)
      .catch((issue: unknown) => setFailure(errorMessage(issue)))
      .finally(() => setBusy(false));
  };
  return { busy, failure, run };
}
