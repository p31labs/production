/**
 * yieldToMain — break a long interaction task so the browser can paint
 * between chunks (INP budget work, see
 * docs/fix-plans/p31ca-inp-lighthouse-budgets.md).
 *
 * Uses the native `scheduler.yield()` when the browser provides it, and
 * falls back to a `setTimeout(0)` macrotask yield everywhere else. Both
 * give the event loop a turn to run pending input/paint work before the
 * next chunk of the handler continues.
 */
export async function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === 'function') {
    return scheduler.yield();
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}