'use client';

import { useEffect, useState } from 'react';
import { CURSOR_SESSION_PATH } from './aiChatPaths';
import { cursorHeaders } from './cursorKeyStore';
import type { CursorSessionInfo } from './cursorTypes';
import { apiKeyedJson } from '@/features/sources/apiClient';
import { errorMessage } from '@/features/sources/errorMessage';

const PREFERRED = /composer-2\.5|composer/i;

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
    apiKeyedJson<CursorSessionInfo>(CURSOR_SESSION_PATH, cursorHeaders(key))
      .then((info) => live && setState({ info, error: null }))
      .catch((issue: unknown) => live && setState({ info: null, error: errorMessage(issue) }));
    return () => {
      live = false;
    };
  }, [key]);

  return { ...state, defaultModel: preferredModel(state.info) };
}

function preferredModel(info: CursorSessionInfo | null): string | null {
  const models = info?.models ?? [];
  return (models.find((model) => PREFERRED.test(model.id)) ?? models[0])?.id ?? null;
}
