import type { FolderHeading } from './fileTreeNodes';

export function FolderHeadingBar({ path, depth }: FolderHeading) {
  const topLevel = depth === 0;
  const Tag = topLevel ? 'h2' : 'h3';
  const scale = topLevel ? 'py-4 text-[22px]' : 'py-3 text-[17px]';
  return <Tag className={`border-b border-panel-edge bg-shade px-2 font-serif leading-tight text-ink ${scale}`}>{path}/</Tag>;
}
