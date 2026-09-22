/**
 * Fixed-window counters kept in this server process's memory.
 *
 * Unlike a per-user cache, this state is meant to be shared by every request:
 * that is how it counts them. It is only correct for a single server process,
 * though. Several instances would each count separately, so a production
 * deployment needs a shared store such as Redis.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Records one attempt for `key`. Returns false once `limit` is used up. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    sweepExpired(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

/** Keeps the map from growing forever when many different keys pass through. */
function sweepExpired(now: number) {
  if (windows.size < 10_000) {
    return;
  }

  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}
