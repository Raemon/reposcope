import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

const requestToken = new AsyncLocalStorage<string | null>();

export function withGithubToken<T>(token: string | null, work: () => Promise<T>): Promise<T> {
  return requestToken.run(token, work);
}

export function userGithubToken(): string | null {
  return requestToken.getStore() ?? null;
}

export function githubToken(): string | null {
  return userGithubToken() ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
}

export function githubTokenIdentity(): string {
  const token = githubToken();
  return token ? createHash('sha256').update(token).digest('hex').slice(0, 16) : 'anonymous';
}
