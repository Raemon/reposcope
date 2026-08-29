'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Landing } from './Landing';
import { useSources, useStoreReady } from './sourceStore';

export function HomeLanding({ error, signInAvailable }: { error: string | null; signInAvailable: boolean }) {
  const ready = useStoreReady();
  const sources = useSources();
  const router = useRouter();
  const connected = ready && sources.length > 0;
  useEffect(() => {
    if (connected) router.replace('/pulls');
  }, [connected, router]);
  if (connected) return null;
  return <Landing error={error} signInAvailable={signInAvailable} />;
}
