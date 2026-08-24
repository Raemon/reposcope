export type GithubAccess = 'all' | 'public';

export function parseGithubAccess(raw: string | null | undefined): GithubAccess {
  return raw === 'public' ? 'public' : 'all';
}

export function oauthScope(access: GithubAccess): string {
  return access === 'public' ? 'public_repo' : 'repo';
}
