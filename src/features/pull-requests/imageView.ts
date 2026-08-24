import { isImagePath } from './imageFiles';
import type { ChangedFile } from './pullRequests';

export const CHECKERBOARD = {
  backgroundImage:
    'linear-gradient(45deg, var(--color-panel-edge) 25%, transparent 25%), linear-gradient(-45deg, var(--color-panel-edge) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-panel-edge) 75%), linear-gradient(-45deg, transparent 75%, var(--color-panel-edge) 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
};

export interface ImageSource {
  ref: string;
  path: string;
}

export function imageFilesOf(files: ChangedFile[]): ChangedFile[] {
  return files.filter((file) => isImagePath(file.filename));
}

export function imageSides(
  file: ChangedFile,
  baseRef: string,
  headRef: string,
): { before: ImageSource | null; after: ImageSource | null } {
  return {
    before: file.status === 'added' ? null : { ref: baseRef, path: file.previousFilename ?? file.filename },
    after: file.status === 'removed' ? null : { ref: headRef, path: file.filename },
  };
}

export function previewSource(file: ChangedFile, baseRef: string, headRef: string): ImageSource {
  const { before, after } = imageSides(file, baseRef, headRef);
  if (after) return after;
  if (before) return before;
  return { ref: headRef, path: file.filename };
}

export function wrapImageIndex(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return ((index + delta) % count + count) % count;
}
