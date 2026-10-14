export const PROBE_BUDGET_MS = 30_000;
export const PROBE_CONCURRENCY = 4;
export const PROBE_CANDIDATE_CAP = 200;

export function probeDeadline(deadline?: number): number {
  return Math.min(deadline ?? Infinity, Date.now() + PROBE_BUDGET_MS);
}

export async function mapBounded<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  opts: { concurrency?: number; deadline?: number; cap?: number } = {},
): Promise<R[]> {
  const selected = items.slice(0, opts.cap ?? PROBE_CANDIDATE_CAP);
  const results: R[] = [];
  const concurrency = Math.max(1, Math.min(opts.concurrency ?? PROBE_CONCURRENCY, PROBE_CONCURRENCY));
  for (let index = 0; index < selected.length; index += concurrency) {
    if (Date.now() >= (opts.deadline ?? Infinity)) break;
    results.push(...await Promise.all(selected.slice(index, index + concurrency).map(fn)));
  }
  return results;
}
