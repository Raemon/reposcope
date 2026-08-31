import { streamRun } from '@/features/ai-chat/cursorApi';
import { cursorFailure, cursorKeyOf, requireText } from '@/features/ai-chat/cursorRoute';

export async function GET(request: Request) {
  const asked = Object.fromEntries(new URL(request.url).searchParams) as Record<string, unknown>;
  try {
    const upstream = await streamRun(cursorKeyOf(request), requireText(asked, 'agent'), requireText(asked, 'run'));
    return new Response(upstream.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', Connection: 'keep-alive' },
    });
  } catch (error) {
    return cursorFailure(error);
  }
}
