export function conflictPrompt({ owner, repo, number, headRef, baseRef }: { owner: string; repo: string; number: number; headRef: string; baseRef: string }): string {
  return [
    `Pull request #${number} in ${owner}/${repo} (branch \`${headRef}\`) has merge conflicts with its base branch \`${baseRef}\`.`,
    `Merge \`${baseRef}\` into \`${headRef}\` and resolve every conflict so the intent of both sides survives.`,
    'Regenerate lockfiles or generated files with the project tooling rather than by hand.',
    'Make sure the project still builds: run its typecheck, lint, and tests where they exist.',
    `Push the merge commit to \`${headRef}\`. Do not rebase, force-push, or open a new pull request.`,
    'Finish with a short summary of how each conflict was resolved.',
  ].join(' ');
}
