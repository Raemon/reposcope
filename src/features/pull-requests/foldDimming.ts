import { DECLARATION_WORDS, type CodeSegment } from './codeSegments';

const KEYWORD_OPACITY = 0.3;
const TAIL_OPACITY = 0.6;

interface NameSpan {
  start: number;
  end: number;
}

export function dimAroundName(segments: CodeSegment[], text: string): CodeSegment[] {
  const name = declaredName(text);
  if (!name) return segments;
  let offset = 0;
  return segments.flatMap((segment) => {
    const pieces = dimSegment(segment, offset, name);
    offset += segment.content.length;
    return pieces;
  });
}

function declaredName(text: string): NameSpan | null {
  for (const match of text.matchAll(/[A-Za-z_$][\w$]*/g)) {
    if (DECLARATION_WORDS.has(match[0])) continue;
    return { start: match.index, end: match.index + match[0].length };
  }
  return null;
}

function dimSegment(segment: CodeSegment, start: number, name: NameSpan): CodeSegment[] {
  return cutPoints(segment.content, start, name).map((from, index, points) => ({
    ...segment,
    content: segment.content.slice(from - start, (points[index + 1] ?? start + segment.content.length) - start),
    opacity: opacityAt(from, name),
  }));
}

function cutPoints(text: string, start: number, name: NameSpan): number[] {
  const inside = [name.start, name.end].filter((point) => point > start && point < start + text.length);
  return [start, ...inside];
}

function opacityAt(position: number, name: NameSpan): number | undefined {
  if (position < name.start) return KEYWORD_OPACITY;
  return position < name.end ? undefined : TAIL_OPACITY;
}
