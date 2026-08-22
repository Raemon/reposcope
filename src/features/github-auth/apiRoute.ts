import { withGithubToken } from '@/features/codebases/githubToken';

export function apiRoute<T>(request: Request, work: () => Promise<T>): Promise<Response> {
  return withGithubToken(bearerToken(request), async () => {
    try {
      return Response.json(await work());
    } catch (error) {
      return Response.json({ error: errorMessage(error) }, { status: errorStatus(error) });
    }
  });
}

export function requireParam(request: Request, name: string, pattern: RegExp): string {
  const value = new URL(request.url).searchParams.get(name) ?? '';
  if (!pattern.test(value)) throw new ApiError(400, `Missing or invalid ${name}`);
  return value;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

function errorStatus(error: unknown): number {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 600 ? status : 500;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
