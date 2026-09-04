export function memoPromise<T>(held: Map<string, Promise<T>>, key: string, work: () => Promise<T>): Promise<T> {
  const running = held.get(key);
  if (running) return running;
  const started = work();
  held.set(key, started);
  return started;
}
