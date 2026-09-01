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
  return sliceStarts(segment.content, start, name).map((from, index, starts) => ({
    ...segment,
    content: segment.content.slice(from, starts[index + 1]),
    opacity: opacityAt(start + from, name),
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
