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

export function abbreviated(segment: DimmedSegment, clip: ReadonlySet<string>): DimmedSegment[] {
  return wordsOf(segment.content)
    .flatMap((word) => (clip.has(word) ? clipped(word) : [{ content: word }]))
    .map((piece) => ({ ...segment, ...piece }));
}

export function abbreviatedLength(text: string): number {
  return wordsOf(text).reduce((length, word) => length + (SHORT[word] ?? word).length, 0);
}

// Clips the longest abbreviable words first, and only as many as it takes to fit the width.
export function wordsToClip(text: string, width: number): Set<string> {
  const clip = new Set<string>();
  let length = text.length;
  for (const word of abbreviableWords(text)) {
    if (length <= width) break;
    clip.add(word);
    length -= word.length - (SHORT[word]?.length ?? word.length);
  }
  return clip;
}

function abbreviableWords(text: string): string[] {
  const words = [...new Set(wordsOf(text).filter((word) => SHORT[word] !== undefined))];
  return words.sort((a, b) => b.length - a.length);
}

function wordsOf(text: string): string[] {
  return text.split(/([A-Za-z]+)/).filter(Boolean);
}

function clipped(word: string): { content: string; elided?: boolean }[] {
  const short = SHORT[word] ?? word;
  return [{ content: short }, { content: word.slice(short.length), elided: true }];
}
