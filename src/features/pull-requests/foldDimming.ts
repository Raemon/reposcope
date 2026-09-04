import { DIM_INK_STYLE, type CodeSegment, type DimmedSegment, type SegmentRole } from './codeSegments';
import type { ThemedToken } from './diffHighlight';
import { abbreviated } from './keywordAbbreviations';

const DIM_OPACITY = 0.45;
const LEADING_SCOPES = /^(keyword|storage|punctuation|comment|meta\.brace)/;

interface NameSpan {
  start: number;
  end: number;
}

export interface FoldLayout {
  indent: number;
  name: NameSpan;
  prefix: string;
}

export function foldLayout(tokens: ThemedToken[] | null): FoldLayout | null {
  const name = tokens && declaredName(tokens);
  if (!name) return null;
  const text = tokens.map((token) => token.content).join('');
  const indent = text.length - text.trimStart().length;
  return { indent, name, prefix: text.slice(indent, name.start) };
}

export function collapsedSegments(segments: CodeSegment[], layout: FoldLayout | null): DimmedSegment[] {
  if (!layout) return segments;
  let offset = 0;
  return segments.flatMap((segment) => {
    const pieces = roleSlices(segment, offset, layout);
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

function roleSlices(segment: CodeSegment, start: number, layout: FoldLayout): DimmedSegment[] {
  const boundaries = [layout.indent, layout.name.start, layout.name.end];
  return slicesAt(segment.content, start, boundaries).flatMap(([from, to]) => {
    const piece = withRole(segment, segment.content.slice(from, to), roleAt(start + from, layout));
    return piece.role === 'prefix' ? abbreviated(piece) : [piece];
  });
}

function roleAt(position: number, { indent, name }: FoldLayout): SegmentRole | null {
  if (position < indent) return null;
  if (position < name.start) return 'prefix';
  return position < name.end ? 'name' : 'tail';
}

function withRole(segment: CodeSegment, content: string, role: SegmentRole | null): DimmedSegment {
  if (role === null) return { ...segment, content };
  if (role === 'name') return { ...segment, content, role };
  return { ...segment, content, role, style: DIM_INK_STYLE, opacity: DIM_OPACITY };
}

function slicesAt(text: string, start: number, points: number[]): [number, number][] {
  const inside = points.map((point) => point - start).filter((at) => at > 0 && at < text.length);
  const cuts = [...new Set(inside)].sort((a, b) => a - b);
  const bounds = [0, ...cuts, text.length];
  return cuts.concat(text.length).map((to, index) => [bounds[index] ?? 0, to]);
}
