'use client';

import { useMemo, type MouseEvent } from 'react';
import type { PeekSides } from './definitionContext';
import { useDefinitionPeekActions, type PeekOrigin } from './definitionPeekStore';
import type { DiffLine } from './diffLines';
import { identifierAtPoint } from './identifierAt';
import type { ChangedFile } from './pullRequests';

export type CodePress = (line: DiffLine, event: MouseEvent<HTMLElement>) => void;

export function originAtPress(sides: PeekSides, line: DiffLine, event: MouseEvent<HTMLElement>): PeekOrigin | null {
  if (!line.cell || line.kind === 'hunk') return null;
  const found = identifierAtPoint(event, event.currentTarget);
  if (!found) return null;
  const ref = line.side === 'left' ? sides.leftRef : sides.rightRef;
  if (ref === null) return null;
  const path = line.side === 'left' ? sides.leftPath : sides.rightPath;
  return { path, ref, line: line.cell.line, column: found.column, word: found.word };
}

export function useDefinitionClick(file: ChangedFile, baseRef: string, headRef: string): CodePress | undefined {
  const actions = useDefinitionPeekActions();
  return useMemo(() => {
    if (!actions) return undefined;
    const sides = {
      leftRef: baseRef,
      leftPath: file.previousFilename ?? file.filename,
      rightRef: headRef,
      rightPath: file.filename,
    };
    return (line: DiffLine, event: MouseEvent<HTMLElement>) => {
      if (event.detail !== 1) return;
      const origin = originAtPress(sides, line, event);
      if (origin) actions.open(origin, { x: event.clientX, y: event.clientY });
    };
  }, [actions, file, baseRef, headRef]);
}
