import { isImagePath } from './imageFiles';
import type { ChangedFile } from './pullRequests';

export interface FolderGroup {
  folder: string;
  files: ChangedFile[];
}

export function folderOf(path: string): string {
  return path.slice(0, Math.max(0, path.lastIndexOf('/')));
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function groupByFolder(files: ChangedFile[]): FolderGroup[] {
  const groups = new Map<string, ChangedFile[]>();
  for (const file of files) {
    const folder = folderOf(file.filename);
    const existing = groups.get(folder);
    if (existing) existing.push(file);
    else groups.set(folder, [file]);
  }
  return [...groups]
    .map(([folder, group]) => ({
      folder,
      files: [...group].sort((a, b) => baseName(a.filename).localeCompare(baseName(b.filename))),
    }))
    .sort(byImageOnlyLast);
}

function holdsOnlyImages(group: FolderGroup): boolean {
  return group.files.every((file) => isImagePath(file.filename));
}

function byImageOnlyLast(a: FolderGroup, b: FolderGroup): number {
  const rank = Number(holdsOnlyImages(a)) - Number(holdsOnlyImages(b));
  return rank || a.folder.localeCompare(b.folder);
}

export function sortByFolder(files: ChangedFile[]): ChangedFile[] {
  return groupByFolder(files).flatMap((group) => group.files);
}
