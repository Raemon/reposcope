'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCodeIntel } from './codeIntelStore';
import { isTypescriptPath, type HoverInfo } from './codeIntelTypes';
import type { CodeIntelClient } from './tsClient';
import type { PeekAnchor, PeekOrigin } from '@/features/pull-requests/definitionPeekStore';

export interface HoverShown {
  anchor: PeekAnchor;
  word: string;
  info: HoverInfo;
}

export interface HoverActions {
  move(origin: PeekOrigin, anchor: PeekAnchor): void;
  leave(): void;
}

const REST_MS = 300;

const HoverActionsContext = createContext<HoverActions | null>(null);
const HoverShownContext = createContext<HoverShown | null>(null);

export function useCodeHoverActions(): HoverActions | null {
  return useContext(HoverActionsContext);
}

export function useCodeHoverShown(): HoverShown | null {
  return useContext(HoverShownContext);
}

export function CodeHoverProvider({ children }: { children: ReactNode }) {
  const { client } = useCodeIntel();
  const [shown, setShown] = useState<HoverShown | null>(null);
  const actions = useMemo(() => hoverActions(client, setShown), [client]);
  useEffect(() => hideOnInteraction(actions.leave), [actions]);
  return (
    <HoverActionsContext value={actions}>
      <HoverShownContext value={shown}>{children}</HoverShownContext>
    </HoverActionsContext>
  );
}

function hoverActions(client: CodeIntelClient, show: (shown: HoverShown | null) => void): HoverActions {
  let wanted: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const leave = () => {
    clearTimeout(timer);
    wanted = null;
    show(null);
  };
  const move = (origin: PeekOrigin, anchor: PeekAnchor) => {
    const key = keyOf(origin);
    if (key === wanted) return;
    leave();
    if (!isTypescriptPath(origin.path)) return;
    wanted = key;
    timer = setTimeout(() => void reveal(client, origin, anchor, () => wanted === key, show), REST_MS);
  };
  return { move, leave };
}

async function reveal(
  client: CodeIntelClient,
  origin: PeekOrigin,
  anchor: PeekAnchor,
  stillWanted: () => boolean,
  show: (shown: HoverShown) => void,
) {
  const info = await client.hover(origin).catch((issue: unknown) => {
    console.warn('code intel hover failed', issue);
    return null;
  });
  if (info && stillWanted()) show({ anchor, word: origin.word, info });
}

function keyOf(origin: PeekOrigin): string {
  return `${origin.ref}\0${origin.path}\0${origin.line}\0${origin.column}`;
}

function hideOnInteraction(hide: () => void): () => void {
  document.addEventListener('pointerdown', hide);
  document.addEventListener('keydown', hide);
  document.addEventListener('scroll', hide, true);
  return () => {
    document.removeEventListener('pointerdown', hide);
    document.removeEventListener('keydown', hide);
    document.removeEventListener('scroll', hide, true);
  };
}
