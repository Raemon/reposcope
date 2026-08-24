import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

const requestToken = new AsyncLocalStorage<string | null>();
const rejectedTokens = new Set<string>();

export function withGithubToken<T>(token: string | null, work: () => Promise<T>): Promise<T> {
  return requestToken.run(token, work);
}

export function userGithubToken(): string | null {
  return requestToken.getStore() ?? null;
}

export function githubToken(): string | null {
  const user = userGithubToken();
  if (user) return usable(user);
  return usable(process.env.GITHUB_TOKEN) ?? usable(process.env.GH_TOKEN);
}

export function rejectGithubToken(token: string): void {
  rejectedTokens.add(token);
}

export function userGithubTokenRejected(): boolean {
  const token = userGithubToken();
  return token !== null && rejectedTokens.has(token);
}

export function githubTokenIdentity(): string {
  const token = githubToken();
  return token ? createHash('sha256').update(token).digest('hex').slice(0, 16) : 'anonymous';
}

function usable(token: string | null | undefined): string | null {
  return token && !rejectedTokens.has(token) ? token : null;
}
