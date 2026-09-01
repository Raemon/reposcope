import type { CodeSegment } from './codeSegments';
import type { ThemedToken } from './diffHighlight';

const KEYWORD_OPACITY = 0.45;
const TAIL_OPACITY = 0.6;
const LEADING_SCOPES = /^(keyword|storage|punctuation|comment|meta\.brace)/;

interface NameSpan {
  start: number;
  end: number;
}

export function dimAroundName(segments: CodeSegment[], tokens: ThemedToken[] | null): CodeSegment[] {
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

function dimSegment(segment: CodeSegment, start: number, name: NameSpan): CodeSegment[] {
  return sliceStarts(segment.content, start, name).map((from, index, starts) => ({
    ...segment,
    content: segment.content.slice(from, starts[index + 1]),
    opacity: opacityAt(start + from, name),
    prefix: start + from < name.start,
  }));
}

function sliceStarts(text: string, start: number, name: NameSpan): number[] {
  const inside = [name.start, name.end].map((point) => point - start).filter((at) => at > 0 && at < text.length);
  return [0, ...inside];
}

function opacityAt(position: number, name: NameSpan): number | undefined {
  if (position < name.start) return KEYWORD_OPACITY;
  return position < name.end ? undefined : TAIL_OPACITY;
}
