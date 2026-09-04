import type { DimmedSegment } from './codeSegments';

// Abbreviations must be prefixes: the hidden tail keeps DOM offsets equal to the source.
const SHORT: Record<string, string> = {
  export: 'exp', import: 'imp', function: 'func', async: 'asy', interface: 'inter', default: 'defau',
  abstract: 'abs', implements: 'impl', extends: 'ext', namespace: 'namesp', readonly: 'readon',
  private: 'priv', protected: 'prot', public: 'pub', static: 'stat', declare: 'decl',
  constructor: 'constr', package: 'pack', module: 'modu', defmodule: 'defmod', defmacro: 'defmac',
  internal: 'intern', override: 'overr', virtual: 'virt', template: 'templ', typename: 'typen',
  unsafe: 'unsaf',
};

export function abbreviated(segment: DimmedSegment): DimmedSegment[] {
  return wordsOf(segment.content).flatMap(clipped).map((piece) => ({ ...segment, ...piece }));
}

export function abbreviatedLength(text: string): number {
  return wordsOf(text).reduce((length, word) => length + (SHORT[word] ?? word).length, 0);
}

function wordsOf(text: string): string[] {
  return text.split(/([A-Za-z]+)/).filter(Boolean);
}

function clipped(word: string): { content: string; elided?: boolean }[] {
  const short = SHORT[word];
  if (!short || !word.startsWith(short)) return [{ content: word }];
  return [{ content: short }, { content: word.slice(short.length), elided: true }];
}
