export function dirOf(path: string): string {
  return path.split('/').slice(0, -1).join('/');
}

export function joinPath(dir: string, spec: string): string {
  const kept: string[] = [];
  for (const part of [...dir.split('/'), ...spec.split('/')]) {
    if (part === '' || part === '.') continue;
    if (part === '..') kept.pop();
    else kept.push(part);
  }
  return kept.join('/');
}
