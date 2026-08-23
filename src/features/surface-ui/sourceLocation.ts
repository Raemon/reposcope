export interface SourceLocation {
  file: string;
  line: number;
  excerpt: string;
}

export function shortFile(file: string): string {
  const segments = file.split('/');
  return segments.length <= 2 ? file : `…/${segments.slice(-2).join('/')}`;
}
