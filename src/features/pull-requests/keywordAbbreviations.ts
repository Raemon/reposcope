import type { CodeSegment } from './codeSegments';

const SHORT: Record<string, string> = {
  export: 'exp', import: 'imp', function: 'func', interface: 'interf', default: 'def', abstract: 'abs',
  implements: 'impl', extends: 'ext', namespace: 'namesp', readonly: 'readon', private: 'priv',
  protected: 'prot', public: 'pub', static: 'stat', declare: 'decl', constructor: 'constr',
  package: 'pkg', module: 'mod', defmodule: 'defmod', defmacro: 'defmac', internal: 'intern',
  override: 'overr', virtual: 'virt', template: 'templ', typename: 'typenm', unsafe: 'unsaf',
};

export function shortenKeywords(segments: CodeSegment[]): CodeSegment[] {
  return segments.map((segment) => (segment.prefix ? shortened(segment) : segment));
}

function shortened(segment: CodeSegment): CodeSegment {
  if (!/^[A-Za-z\s]+$/.test(segment.content)) return segment;
  const content = segment.content.replace(/[A-Za-z]+/g, (word) => SHORT[word] ?? word);
  return { ...segment, content, shortenedBy: segment.content.length - content.length };
}
