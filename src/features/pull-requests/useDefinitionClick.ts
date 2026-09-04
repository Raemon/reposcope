'use client';

import { useMemo, type MouseEvent } from 'react';
import type { PeekSides } from './definitionContext';
import { useCodeHoverActions, type HoverActions } from '@/features/code-intel/codeHoverStore';
import { useDefinitionPeekActions, type PeekActions, type PeekOrigin } from './definitionPeekStore';
import type { DiffLine } from './diffLines';
import { diffEditModeOn } from './editModeStore';
import { identifierAtPoint } from './identifierAt';
import type { ChangedFile } from './pullRequests';

export type CodePress = (line: DiffLine, event: MouseEvent<HTMLElement>) => void;

export interface CodeHover {
  move(line: DiffLine, event: MouseEvent<HTMLElement>): void;
  leave(): void;
}

export function originAtPress(sides: PeekSides, line: DiffLine, event: MouseEvent<HTMLElement>): PeekOrigin | null {
  if (!line.cell || line.kind === 'hunk') return null;
  const found = identifierAtPoint(event, event.currentTarget);
  if (!found) return null;
  const ref = line.side === 'left' ? sides.leftRef : sides.rightRef;
  if (ref === null) return null;
  const path = line.side === 'left' ? sides.leftPath : sides.rightPath;
  return { path, ref, line: line.cell.line, column: found.column, word: found.word };
}

export function keepSelectionOnShiftClick(event: MouseEvent<HTMLElement>) {
  if (event.shiftKey) event.preventDefault();
}

export function useDefinitionClick(file: ChangedFile, baseRef: string, headRef: string): CodePress | undefined {
  const actions = useDefinitionPeekActions();
  return useMemo(() => (actions ? codePress(sidesOf(file, baseRef, headRef), actions) : undefined), [actions, file, baseRef, headRef]);
}

export function useCodeHover(file: ChangedFile, baseRef: string, headRef: string): CodeHover | undefined {
  const actions = useCodeHoverActions();
  return useMemo(() => (actions ? codeHover(sidesOf(file, baseRef, headRef), actions) : undefined), [actions, file, baseRef, headRef]);
}

function codePress(sides: PeekSides, actions: PeekActions): CodePress {
  return (line, event) => {
    if (event.detail !== 1 || diffEditModeOn()) return;
    const origin = originAtPress(sides, line, event);
    if (!origin) return;
    const anchor = { x: event.clientX, y: event.clientY };
    if (event.shiftKey) actions.openReferences(origin, anchor);
    else actions.open(origin, anchor);
  };
}

export function codeHover(sides: PeekSides, actions: HoverActions): CodeHover {
  const move = (line: DiffLine, event: MouseEvent<HTMLElement>) => {
    const origin = diffEditModeOn() ? null : originAtPress(sides, line, event);
    if (origin) actions.move(origin, { x: event.clientX, y: event.clientY });
    else actions.leave();
  };
  return { move, leave: actions.leave };
}

function sidesOf(file: ChangedFile, baseRef: string, headRef: string): PeekSides {
  return {
    leftRef: baseRef,
    leftPath: file.previousFilename ?? file.filename,
    rightRef: headRef,
    rightPath: file.filename,
  };
}
