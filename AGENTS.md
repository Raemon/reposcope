look at claude.md

## Cursor Cloud specific instructions

Standard commands live in `CLAUDE.md` and `package.json` (dev on port 2111,
`npm run typecheck`, `npm run build` which runs `npm run check:caching`).

- The app runs against GitHub with no secrets: `githubToken` falls back to
  unauthenticated requests for public repos, so `npm run dev` and browsing
  public repos/PRs works out of the box (subject to GitHub's 60 req/hr
  unauthenticated limit). Set `GITHUB_TOKEN` or `GH_TOKEN` to raise the limit;
  set `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` only if testing the OAuth
  connect flow.
- GitHub responses are cached to disk (`REPOSCOPE_CACHE_DIR`, defaulting to a
  temp dir) and revalidated with ETags, so repeated loads of the same pull
  request are cheap.
