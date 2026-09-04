import { readRun, startFollowup } from '@/features/ai-chat/cursorApi';
import { cursorRoute, queryOf, requireText } from '@/features/ai-chat/cursorRoute';

export async function GET(request: Request) {
  const asked = queryOf(request);
  return cursorRoute(request, (key) => readRun(key, requireText(asked, 'agent'), requireText(asked, 'run')));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return cursorRoute(request, (key) =>
    startFollowup(key, { agentId: requireText(body, 'agent'), prompt: requireText(body, 'prompt') }),
  );
}
