import { DIM_INK_STYLE, type CodeSegment, type DimmedSegment } from './codeSegments';
import type { ThemedToken } from './diffHighlight';
import { abbreviated } from './keywordAbbreviations';

const DIM_OPACITY = 0.45;
const LEADING_SCOPES = /^(keyword|storage|punctuation|comment|meta\.brace)/;

interface NameSpan {
  start: number;
  end: number;
}

export function collapsedSegments(segments: CodeSegment[], tokens: ThemedToken[] | null): DimmedSegment[] {
  const name = tokens && declaredName(tokens);
  if (!name) return segments;
  let offset = 0;
  return segments.flatMap((segment) => {
    const pieces = dimSegment(segment, offset, name);
    offset += segment.content.length;
    return pieces;
  });
}

function declaredName(tokens: ThemedToken[]): NameSpan | null {
  let at = 0;
  for (const token of tokens) {
    if (namesTheBlock(token)) return { start: at, end: at + token.content.length };
    at += token.content.length;
  }
  return null;
}

function namesTheBlock(token: ThemedToken): boolean {
  return /\w/.test(token.content) && !LEADING_SCOPES.test(innermostScope(token));
}

function innermostScope(token: ThemedToken): string {
  const scopes = token.explanation?.[0]?.scopes ?? [];
  return scopes[scopes.length - 1]?.scopeName ?? '';
}

function dimSegment(segment: CodeSegment, start: number, name: NameSpan): DimmedSegment[] {
  return nameSlices(segment.content, start, name).flatMap(([from, to]) => {
    const piece = dimmedPiece(segment, segment.content.slice(from, to), start + from, name);
    return start + from < name.start ? abbreviated(piece) : [piece];
  });
}

function dimmedPiece(segment: CodeSegment, content: string, position: number, name: NameSpan): DimmedSegment {
  if (position >= name.start && position < name.end) return { ...segment, content };
  return { ...segment, content, style: DIM_INK_STYLE, opacity: DIM_OPACITY };
}

// Slices the segment where the declared name starts and ends, so each piece dims as a whole.
function nameSlices(text: string, start: number, name: NameSpan): [number, number][] {
  const cuts = [name.start, name.end].map((point) => point - start).filter((at) => at > 0 && at < text.length);
  const bounds = [0, ...cuts, text.length];
  return bounds.slice(0, -1).map((from, index) => [from, bounds[index + 1] ?? text.length]);
}

