import type { CodeSegment } from './codeSegments';
import { KEYWORD_OPACITY } from './foldDimming';

const SHORT: Record<string, string> = {
  export: 'exp', import: 'imp', function: 'func', interface: 'interf', default: 'def', abstract: 'abs',
  implements: 'impl', extends: 'ext', namespace: 'namesp', readonly: 'readon', private: 'priv',
  protected: 'prot', public: 'pub', static: 'stat', declare: 'decl', constructor: 'constr',
  package: 'pkg', module: 'mod', defmodule: 'defmod', defmacro: 'defmac', internal: 'intern',
  override: 'overr', virtual: 'virt', template: 'templ', typename: 'typenm', unsafe: 'unsaf',
};

export function shortenKeywords(segments: CodeSegment[]): CodeSegment[] {
  return segments.map((segment) =>
    segment.opacity === KEYWORD_OPACITY ? { ...segment, content: shortWords(segment.content) } : segment,
  );
}

function shortWords(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word) => SHORT[word] ?? word);
}
