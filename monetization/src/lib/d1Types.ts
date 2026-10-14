/**
 * Minimal structural types for the Cloudflare D1 binding.
 *
 * This workspace has no `@cloudflare/workers-types` dev dependency, so these
 * narrow interfaces keep `tsc --noEmit` green while matching the runtime shape
 * of the D1 binding exactly for the statements we use. Only add members we
 * actually call — this is a contract surface, not a full port.
 */

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: unknown;
  error?: string;
}

export interface D1PreparedStatement<T = unknown> {
  bind(...values: unknown[]): D1PreparedStatement<T>;
  first<T2 = T>(colName?: string): Promise<T2 | null>;
  all<T2 = T>(): Promise<D1Result<T2>>;
  run(): Promise<D1Result>;
  raw<T2 = unknown[]>(options?: { columnNames?: boolean }): Promise<T2[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement<T>[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1Result>;
}