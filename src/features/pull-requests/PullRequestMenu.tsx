'use client';

import { PullRequestList } from './PullRequestList';
import { HeaderMenu } from '@/features/codebases/HeaderMenu';
import type { RepoRef } from '@/features/sources/parseRepoLink';

export function PullRequestMenu({ repo }: { repo: RepoRef }) {
  return (
    <HeaderMenu label="PRs" width="w-[26rem]">
      {() => <PullRequestList repo={repo} />}
    </HeaderMenu>
  );
}
