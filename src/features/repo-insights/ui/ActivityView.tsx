'use client';

import { useContext } from 'react';
import { Tooltip } from '@/features/surface-ui/Tooltip';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import { RepoRefContext } from '@/features/surface-ui/SourceRef';
import { timeAgo } from './timeAgo';
import type { ActivitySummary } from '../insightTypes';

export function ActivityView({ activity }: { activity: ActivitySummary }) {
  const held = useContext(RepoRefContext);
  const authors = [...new Set(activity.commits.map((commit) => commit.author))];
  const newest = activity.commits[0];
  return (
    <InsightSection
      id="activity"
      kicker="Straight from the commit log"
      title="Activity"
      blurb="The last commits, newest first — a feed of what has been happening to this codebase, and who or what has been doing it."
      stat={`${activity.commits.length} recent commits · ${authors.length} ${authors.length === 1 ? 'author' : 'authors'}${newest ? ` · latest ${timeAgo(newest.date)}` : ''}`}
      as="h1"
    >
      <InsightPanel>
        <InsightTable caption="Recent commits" columns={['When', 'Commit', 'Message', 'Author']}>
          {activity.commits.map((commit) => (
            <tr key={commit.sha} className="border-b border-panel-edge last:border-b-0">
              <td className="whitespace-nowrap py-1 pl-2 pr-3 align-top font-mono text-[10px] leading-5 text-ink-dim">
                <Tooltip label={commit.sha} tip={<p className="font-mono text-[11px] text-ink">{new Date(commit.date).toLocaleString()}</p>}>
                  <span>{timeAgo(commit.date)}</span>
                </Tooltip>
              </td>
              <td className="py-1 pr-3 align-top font-mono text-[10px] leading-5">
                {held ? (
                  <a
                    href={`https://github.com/${held.owner}/${held.repo}/commit/${commit.sha}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-dim underline decoration-btn-edge underline-offset-2 hover:text-accent"
                  >
                    {commit.sha}
                  </a>
                ) : (
                  <span className="text-ink-dim">{commit.sha}</span>
                )}
              </td>
              <td className="max-w-md py-1 pr-3 align-top font-mono text-[11px] leading-5 text-ink">
                <span className="line-clamp-1">{commit.message}</span>
              </td>
              <td className="whitespace-nowrap py-1 pr-2 align-top font-mono text-[10px] leading-5 text-ink-dim">{commit.author}</td>
            </tr>
          ))}
        </InsightTable>
      </InsightPanel>
    </InsightSection>
  );
}
