import { CursorError } from './cursorApi';
import { CURSOR_KEY_HEADER } from './cursorTypes';
import { errorMessage } from '@/features/surface-ui/errorMessage';

export function cursorKeyOf(request: Request): string {
  const key = request.headers.get(CURSOR_KEY_HEADER);
  if (!key) throw new CursorError(401, 'Add a Cursor API key to use AI chat.');
  return key;
}

export async function cursorRoute<T>(request: Request, work: (key: string) => Promise<T>): Promise<Response> {
  try {
    return Response.json(await work(cursorKeyOf(request)));
  } catch (error) {
    return cursorFailure(error);
  }
}

export function cursorFailure(error: unknown): Response {
  const status = error instanceof CursorError ? error.status : 500;
  return Response.json({ error: errorMessage(error) }, { status });
}

export function requireText(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== 'string' || value.trim() === '') throw new CursorError(400, `Missing ${name}`);
  return value;
}

export function optionalText(body: Record<string, unknown>, name: string): string | null {
  const value = body[name];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}
