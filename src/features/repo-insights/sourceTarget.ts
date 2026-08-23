export function locationTarget(at: { file: string; line: number }): string {
  return `${at.file}:${at.line}`;
}

export function targetHoldsPath(target: string | null, path: string): boolean {
  if (target === null || path === '') return false;
  const held = target.split(':')[0]!;
  return held === path || held.startsWith(`${path}/`);
}

export function surfaceQuery(params: URLSearchParams): string {
  return params.toString().replace(/%2F/g, '/').replace(/%3A/g, ':');
}
