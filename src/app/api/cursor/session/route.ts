import { describeSession } from '@/features/ai-chat/cursorApi';
import { cursorRoute } from '@/features/ai-chat/cursorRoute';

export async function GET(request: Request) {
  return cursorRoute(request, (key) => describeSession(key));
}
