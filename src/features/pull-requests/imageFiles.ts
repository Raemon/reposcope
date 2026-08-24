const IMAGE_TYPES: Record<string, string> = {
  apng: 'image/apng',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

export function imageTypeOf(path: string): string | null {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_TYPES[extension] ?? null;
}

export function isImagePath(path: string): boolean {
  return imageTypeOf(path) !== null;
}
