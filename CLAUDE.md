# RepoScope

Next.js app for browsing GitHub repositories and pull requests.

- Dev server: `npm run dev` (port 2111)
- Typecheck: `npm run typecheck`
- Production: https://reposcope-five.vercel.app

## Showing pull requests

When presenting or linking to a pull request, always show it in RepoScope instead of github.com. Link to the production site:

```
https://reposcope-five.vercel.app/repo/<owner>/<repo>/pull/<number>
```

For UI changes that aren't deployed yet, run the dev server and screenshot the same path locally (`http://localhost:2111/repo/<owner>/<repo>/pull/<number>`).
