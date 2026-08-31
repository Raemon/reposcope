'use client';

import { useState, type ReactNode } from 'react';
import { useShowsColumn } from './centralLayout';
import { useRegisterColumn } from './columnNav';
import { RepoBrowseReader } from './RepoBrowseReader';
import { RepoFileList } from './RepoFileList';
import { useRepoFiles } from './repoFileStore';
import { ResizableColumn, collapsibleColumn } from './ResizableColumn';
import { useStickyColumn } from './stickyColumns';
import { useRepoFileTree } from './useRepoFileTree';

export function RepoFilesBrowser({ owner, repo, children }: { owner: string; repo: string; children: ReactNode }) {
  const [fileSize, setFileSize] = useStickyColumn('repo-files');
  const [browsed, setBrowsed] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const repoFiles = useRepoFiles(owner, repo, fileSize.open || browsed !== null);
  const tree = useRepoFileTree({ repoFiles, query, selected: browsed, onSelect: setBrowsed });
  useRegisterColumn(
    'files',
    {
      ...collapsibleColumn(fileSize, setFileSize),
      items: tree.navItems,
      selected: browsed,
      onSelect: tree.selectItem,
      onActivate: tree.activateItem,
    },
    useShowsColumn('files'),
  );
  const fileSet = repoFiles.fileSet;
  return (
    <div className="flex min-h-0 flex-1 max-md:flex-col max-md:overflow-y-auto">
      <div className="flex min-h-0 w-full flex-col border-panel-edge md:w-[360px] md:shrink-0 md:border-r">{children}</div>
      <ResizableColumn navId="files" icon="▤" title="all files" size={fileSize} onSize={setFileSize}>
        <RepoFileList
          repoFiles={repoFiles}
          tree={tree}
          selected={browsed}
          onSelect={setBrowsed}
          query={query}
          onQuery={setQuery}
        />
      </ResizableColumn>
      <div className="flex min-w-0 flex-1 flex-col max-md:h-[80vh] max-md:flex-none">
        {browsed !== null && fileSet !== null ? (
          <RepoBrowseReader owner={owner} repo={repo} fileSet={fileSet} tree={tree} item={browsed} />
        ) : (
          <p className="px-2 py-1 text-[11px] text-ink-dim">Pick a file or folder to read it here.</p>
        )}
      </div>
    </div>
  );
}
