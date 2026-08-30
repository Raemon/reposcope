import { baseName, folderOf } from './fileTree';
import type { RepoFiles } from './repoFileStore';

const SHOWN_LIMIT = 400;
const FILE_PREFIX = 'file:';
const FOLDER_PREFIX = 'dir:';

export interface TreeFolder {
  kind: 'folder';
  path: string;
  name: string;
  children: TreeNode[];
}

export interface TreeFile {
  kind: 'file';
  path: string;
  name: string;
}

export type TreeNode = TreeFolder | TreeFile;

export interface TreeRow {
  node: TreeNode;
  depth: number;
}

export function browseKey(path: string): string {
  return `${FILE_PREFIX}${path}`;
}

export function browsedPath(item: string): string | null {
  return item.startsWith(FILE_PREFIX) ? item.slice(FILE_PREFIX.length) : null;
}

export function folderKey(path: string): string {
  return `${FOLDER_PREFIX}${path}`;
}

export function folderedPath(item: string): string | null {
  return item.startsWith(FOLDER_PREFIX) ? item.slice(FOLDER_PREFIX.length) : null;
}

export function isTreeItem(item: string): boolean {
  return item.startsWith(FILE_PREFIX) || item.startsWith(FOLDER_PREFIX);
}

export function rowKey(row: TreeRow): string {
  return row.node.kind === 'folder' ? folderKey(row.node.path) : browseKey(row.node.path);
}

export function listedPaths(repoFiles: RepoFiles, query: string): { shown: string[]; total: number } {
  const paths = repoFiles.fileSet?.files ?? [];
  const wanted = query.trim().toLowerCase();
  if (!wanted) return { shown: paths, total: paths.length };
  const matching = paths.filter((path) => path.toLowerCase().includes(wanted));
  return { shown: matching.slice(0, SHOWN_LIMIT), total: matching.length };
}

export function buildFileTree(paths: string[]): TreeNode[] {
  const folders = new Map<string, TreeFolder>([['', { kind: 'folder', path: '', name: '', children: [] }]]);
  for (const path of paths) {
    folderFor(folders, folderOf(path)).children.push({ kind: 'file', path, name: baseName(path) });
  }
  return sortNodes(folders.get('')!.children);
}

function folderFor(folders: Map<string, TreeFolder>, path: string): TreeFolder {
  const held = folders.get(path);
  if (held) return held;
  const made: TreeFolder = { kind: 'folder', path, name: baseName(path), children: [] };
  folders.set(path, made);
  folderFor(folders, folderOf(path)).children.push(made);
  return made;
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  for (const node of nodes) if (node.kind === 'folder') sortNodes(node.children);
  return nodes.sort((a, b) => foldersFirst(a, b) || a.name.localeCompare(b.name));
}

function foldersFirst(a: TreeNode, b: TreeNode): number {
  return Number(a.kind === 'file') - Number(b.kind === 'file');
}

export function visibleRows(nodes: TreeNode[], isOpen: (path: string) => boolean, depth = 0): TreeRow[] {
  return nodes.flatMap((node) => {
    const row = { node, depth };
    if (node.kind === 'file' || !isOpen(node.path)) return [row];
    return [row, ...visibleRows(node.children, isOpen, depth + 1)];
  });
}

export function ancestorFolders(path: string): string[] {
  const folders: string[] = [];
  for (let at = folderOf(path); at !== ''; at = folderOf(at)) folders.push(at);
  return folders;
}
