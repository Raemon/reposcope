import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { parseGithubAccess, type GithubAccess } from './githubAccess';

const STATE_COOKIE = 'reposcope-oauth-state';
const STATE_PATH = '/api/github';
const MAX_AGE = 10 * 60;

export async function issueOauthState(access: GithubAccess): Promise<string> {
  const state = `${access}.${randomBytes(16).toString('hex')}`;
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: STATE_PATH,
    maxAge: MAX_AGE,
  });
  return state;
}

export async function consumeOauthState(): Promise<string | null> {
  const jar = await cookies();
  const state = jar.get(STATE_COOKIE)?.value ?? null;
  jar.delete({ name: STATE_COOKIE, path: STATE_PATH });
  return state;
}

export function accessFromState(state: string): GithubAccess {
  return parseGithubAccess(state.split('.')[0]);
}
