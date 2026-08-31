export interface SseEvent {
  event: string;
  data: string;
}

export async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffered += decoder.decode(value, { stream: true });
    const chunks = buffered.split('\n\n');
    buffered = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const parsed = parseChunk(chunk);
      if (parsed !== null) yield parsed;
    }
  }
}

function parseChunk(chunk: string): SseEvent | null {
  const data: string[] = [];
  let event = 'message';
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  return data.length === 0 ? null : { event, data: data.join('\n') };
}
