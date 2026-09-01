'use client';

import { attentionReader, type PullAttention } from './pullAttention';
import type { PullRequestSummary } from './pullRequests';
import { useSeenPulls } from './seenPullStore';
import { useIsOwnAuthor } from '@/features/github-auth/useViewerLogin';

export function useAttentionReader<T extends PullRequestSummary>(
  keyOf: (pull: T) => string,
): (pull: T) => PullAttention {
  return attentionReader(keyOf, useSeenPulls(), useIsOwnAuthor());
}
