import type { CodeSegment } from './codeSegments';

// Truncations only: the clipped tail stays in the DOM unrendered, so text offsets still match the source.
const SHORT: Record<string, string> = {
  export: 'exp', import: 'imp', function: 'func', async: 'asy', interface: 'interf', default: 'def',
  abstract: 'abs', implements: 'impl', extends: 'ext', namespace: 'namesp', readonly: 'readon',
  private: 'priv', protected: 'prot', public: 'pub', static: 'stat', declare: 'decl',
  constructor: 'constr', package: 'pack', module: 'mod', defmodule: 'defmod', defmacro: 'defmac',
  internal: 'intern', override: 'overr', virtual: 'virt', template: 'templ', typename: 'typen',
  unsafe: 'unsaf',
};

export function shortenKeywords(segments: CodeSegment[]): CodeSegment[] {
  return segments.flatMap((segment) => (segment.prefix ? shortened(segment) : [segment]));
}

function shortened(segment: CodeSegment): CodeSegment[] {
  if (!/^[A-Za-z\s]+$/.test(segment.content)) return [segment];
  return wordsOf(segment.content).flatMap(clipped).map((piece) => ({ ...segment, ...piece }));
}

function wordsOf(text: string): string[] {
  return text.split(/([A-Za-z]+)/).filter(Boolean);
}

function clipped(word: string): { content: string; elided?: boolean }[] {
  const short = SHORT[word];
  if (!short || !word.startsWith(short)) return [{ content: word }];
  return [{ content: short }, { content: word.slice(short.length), elided: true }];
}
