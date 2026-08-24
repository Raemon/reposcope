import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

const STATE_COOKIE = 'shoggoth-oauth-state';
const STATE_PATH = '/api/github';
const MAX_AGE = 10 * 60;

export async function issueOauthState(): Promise<string> {
  const state = randomBytes(16).toString('hex');
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
