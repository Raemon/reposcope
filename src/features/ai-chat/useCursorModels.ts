'use client';

import { useEffect, useState } from 'react';
import { CURSOR_SESSION_PATH } from './aiChatPaths';
import { cursorHeaders } from './cursorKeyStore';
import type { CursorSessionInfo } from './cursorTypes';
import { DEFAULT_FAMILY, latestModel } from './modelFamilies';
import { memoPromise } from '@/features/pull-requests/promiseMemo';
import { apiKeyedJson } from '@/features/sources/apiClient';
import { errorMessage } from '@/features/sources/errorMessage';

const described = new Map<string, Promise<CursorSessionInfo>>();

export interface CursorAccount {
  info: CursorSessionInfo | null;
  error: string | null;
  defaultModel: string | null;
}

export function useCursorAccount(key: string | null): CursorAccount {
  const [state, setState] = useState<{ info: CursorSessionInfo | null; error: string | null }>({ info: null, error: null });

  useEffect(() => {
    if (key === null) return setState({ info: null, error: null });
    let live = true;
    describeOnce(key)
      .then((info) => live && setState({ info, error: null }))
      .catch((issue: unknown) => live && setState({ info: null, error: errorMessage(issue) }));
    return () => {
      live = false;
    };
  }, [key]);

  return { ...state, defaultModel: preferredModel(state.info) };
}

// Forget a failed description so a retyped key or later mount refetches it.
function describeOnce(key: string): Promise<CursorSessionInfo> {
  return memoPromise(described, key, () =>
    apiKeyedJson<CursorSessionInfo>(CURSOR_SESSION_PATH, cursorHeaders(key)).catch((issue: unknown) => {
      described.delete(key);
      throw issue;
    }),
  );
}

function preferredModel(info: CursorSessionInfo | null): string | null {
  const models = info?.models ?? [];
  return (latestModel(models, DEFAULT_FAMILY) ?? models[0])?.id ?? null;
}
