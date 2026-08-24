import type { CSSProperties } from 'react';
import type { ThemedToken } from './diffHighlight';
import type { CharRange } from './intralineDiff';

export interface CodeSegment {
  content: string;
  style?: CSSProperties;
  emphasized: boolean;
}

export function codeSegments(
  text: string,
  lineTokens: ThemedToken[] | null,
  ranges: CharRange[] | null,
): CodeSegment[] {
  const colored = coloredPieces(text, lineTokens);
  if (!ranges?.length) return colored.map((piece) => ({ ...piece, emphasized: false }));
  return splitColoredByRanges(colored, ranges);
}

function coloredPieces(text: string, lineTokens: ThemedToken[] | null): { content: string; style?: CSSProperties }[] {
  return lineTokens?.length
    ? lineTokens.map((token) => ({ content: token.content, style: token.htmlStyle as CSSProperties }))
    : [{ content: text }];
}

function splitColoredByRanges(
  colored: { content: string; style?: CSSProperties }[],
  ranges: CharRange[],
): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let offset = 0;
  for (const piece of colored) {
    for (const part of splitAtRanges(offset, piece.content, ranges)) {
      segments.push({ content: part.content, style: piece.style, emphasized: part.emphasized });
    }
    offset += piece.content.length;
  }
  return segments;
}

function splitAtRanges(start: number, text: string, ranges: CharRange[]) {
  const parts: { content: string; emphasized: boolean }[] = [];
  let position = 0;
  while (position < text.length) {
    const absolute = start + position;
    const inside = ranges.find((range) => absolute >= range.start && absolute < range.end);
    const nextStart = ranges.find((range) => range.start > absolute)?.start ?? start + text.length;
    const stop = Math.min(text.length, (inside ? inside.end : nextStart) - start);
    parts.push({ content: text.slice(position, stop), emphasized: Boolean(inside) });
    position = stop;
  }
  return parts;
}
