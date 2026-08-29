import { isImagePath } from './imageFiles';
import type { ChangedFile } from './pullRequests';

export interface FolderGroup<T> {
  folder: string;
  items: T[];
}

export function folderOf(path: string): string {
  return path.slice(0, Math.max(0, path.lastIndexOf('/')));
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function groupByFolder<T>(items: T[], pathOf: (item: T) => string): FolderGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const folder = folderOf(pathOf(item));
    const existing = groups.get(folder);
    if (existing) existing.push(item);
    else groups.set(folder, [item]);
  }
  return [...groups]
    .map(([folder, group]) => ({
      folder,
      items: [...group].sort((a, b) => baseName(pathOf(a)).localeCompare(baseName(pathOf(b)))),
    }))
    .sort(byImageOnlyLast(pathOf));
}

function byImageOnlyLast<T>(pathOf: (item: T) => string) {
  const holdsOnlyImages = (group: FolderGroup<T>) => group.items.every((item) => isImagePath(pathOf(item)));
  return (a: FolderGroup<T>, b: FolderGroup<T>) =>
    Number(holdsOnlyImages(a)) - Number(holdsOnlyImages(b)) || a.folder.localeCompare(b.folder);
}

export function sortByFolder(files: ChangedFile[]): ChangedFile[] {
  return groupByFolder(files, (file) => file.filename).flatMap((group) => group.items);
}
