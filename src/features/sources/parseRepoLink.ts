import { LOGIN_PATTERN } from './sourceTypes';

export type RepoRef = { owner: string; name: string };
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const REPO_PATH = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?(?:[/#?].*)?$/;

export function sameRepo(a: RepoRef, b: RepoRef): boolean {
  return a.owner.toLowerCase() === b.owner.toLowerCase() && a.name.toLowerCase() === b.name.toLowerCase();
}

export function parseRepoLink(input: string): Parsed<RepoRef> {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'Enter a repository link like https://github.com/owner/repo' };
  const path = text.startsWith('git@github.com:')
    ? text.slice('git@github.com:'.length)
    : text.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '');
  const match = path.match(REPO_PATH);
  if (!match?.[1] || !match[2]) {
    return { ok: false, error: `Not a GitHub repository link: ${text}` };
  }
  return { ok: true, value: { owner: match[1], name: match[2] } };
}

export function parseOwnerInput(input: string): Parsed<string> {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'Enter a GitHub login like LessWrong2' };
  const login = text.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '').replace(/\/+$/, '');
  if (!LOGIN_PATTERN.test(login)) return { ok: false, error: `Not a GitHub login: ${text}` };
  return { ok: true, value: login };
}
