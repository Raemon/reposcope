import { GithubRequestError } from '@/features/codebases/githubRequest';

export function text(value: unknown, name: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value === '')) {
    throw new GithubRequestError(400, `Missing or invalid ${name}`);
  }
  return value;
}

export function counting(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new GithubRequestError(400, `Missing or invalid ${name}`);
  }
  return value;
}

export function matching(value: unknown, name: string, pattern: RegExp): string {
  const given = text(value, name);
  if (!pattern.test(given)) throw new GithubRequestError(400, `Invalid ${name}`);
  return given;
}
