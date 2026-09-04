import { listAgents } from '@/features/ai-chat/cursorApi';
import { cursorRoute, queryOf, requireText } from '@/features/ai-chat/cursorRoute';

export async function GET(request: Request) {
  const asked = queryOf(request);
  return cursorRoute(request, (key) => listAgents(key, requireText(asked, 'prUrl')));
}
