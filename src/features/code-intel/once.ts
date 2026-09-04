export function once<T>(held: Map<string, Promise<T>>, key: string, work: () => Promise<T>): Promise<T> {
  const running = held.get(key);
  if (running) return running;
  const started = work().catch((issue: unknown) => {
    held.delete(key);
    throw issue;
  });
  held.set(key, started);
  return started;
}
