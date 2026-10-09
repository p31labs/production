/**
 * The music maker — safe storage.
 *
 * localStorage in a sandboxed iframe can throw SecurityError when the frame's
 * origin is opaque (e.g. sandbox without allow-same-origin). Every read/write
 * goes through try/catch so a blocked storage never crashes a session — the
 * "silent until opted in, every session" discipline extends to preferences:
 * they degrade to session-only, never to a crash.
 */

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Blocked storage — the preference simply won't survive the session.
  }
}