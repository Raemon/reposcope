export async function mapWithWorkers<T, R>(items: T[], workers: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    for (let at = next++; at < items.length; at = next++) results[at] = await run(items[at] as T);
  };
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, worker));
  return results;
}
