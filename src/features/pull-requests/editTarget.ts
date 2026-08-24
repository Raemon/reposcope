'use client';

import { createContext } from 'react';
import type { PullRequestSummary } from './pullRequests';

export interface EditTargetValue {
  pull: PullRequestSummary;
  headRef: string;
  onCommitted?: () => void | Promise<void>;
}

export const EditTarget = createContext<EditTargetValue | null>(null);
