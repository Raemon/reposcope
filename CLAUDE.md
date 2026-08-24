# RepoScope

Next.js app for browsing GitHub repositories and pull requests.

- Dev server: `npm run dev` (port 2111)
- Typecheck: `npm run typecheck`
- Production: https://reposcope-five.vercel.app

## GitHub access

Every read from GitHub goes through `githubJson`/`githubBytes` in
`src/features/codebases/githubRequest.ts`, which caches responses to disk and
revalidates them with ETags. Do not call `fetch` anywhere else — `npm run
check:caching` runs as part of `npm run build` and fails on new call sites.

## Showing pull requests

Always end a task by creating a PR.

When presenting or linking to a pull request, always show it in RepoScope instead of github.com. Link to the production site:

```
https://reposcope-five.vercel.app/repo/<owner>/<repo>/pull/<number>
```

For UI changes that aren't deployed yet, run the dev server and screenshot the same path locally (`http://localhost:2111/repo/<owner>/<repo>/pull/<number>`).

Include screenshots as files in public/screenshots/

If you make followup PRs after an existing merged PR, make it directly against origin/main instead of against the previous PR.
