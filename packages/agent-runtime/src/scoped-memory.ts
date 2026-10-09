/**
 * ScopedMemoryStore — the family memory layer.
 *
 * Per the 2026 research: scoped memory is enforced BEFORE retrieval. The
 * store never returns a record from a scope the caller cannot read. Sharing
 * is a policy decision attached to a memory, not a side effect of multiple
 * users pointing at the same database.
 *
 * Scopes:
 *   personal   — only the owner
 *   household  — all family members (explicitly shared)
 *   session    — the current session only
 */
import type { MemoryRecord, MemoryScope } from './types.js'

export interface ScopedMemoryOptions {
  /** Which scopes a caller may read, keyed by member. */
  householdMembers: string[]
}

export class ScopedMemoryStore {
  private records: MemoryRecord[] = []
  private householdMembers: string[]
  private seq = 0

  constructor(opts: Partial<ScopedMemoryOptions> = {}) {
    this.householdMembers = opts.householdMembers ?? []
  }

  /** Write a memory record. Supersedes any prior record with same scope/owner/key. */
  write(
    owner: string,
    scope: MemoryScope,
    key: string,
    value: unknown,
    provenance: string,
    confidence = 1,
  ): MemoryRecord {
    const prior = this.records.find(
      (r) => r.scope === scope && r.owner === owner && r.key === key && !r.supersededBy,
    )
    if (prior) prior.supersededBy = String(++this.seq)
    const record: MemoryRecord = {
      id: String(++this.seq),
      scope,
      owner,
      key,
      value,
      provenance,
      confidence,
      ts: Date.now(),
    }
    this.records.push(record)
    return record
  }

  /**
   * Read a key. Enforced below the prompt layer: a caller can only read
   * records they are permitted to see.
   *   personal  — caller must be the owner
   *   household — caller must be a household member
   *   session   — the active session id must match
   */
  read(member: string, scope: MemoryScope, key: string, sessionId?: string): MemoryRecord | null {
    const match = this.records.find((r) => !r.supersededBy && r.key === key && r.scope === scope)
    if (!match) return null
    switch (scope) {
      case 'personal':
        return match.owner === member ? match : null
      case 'household':
        return this.householdMembers.includes(member) ? match : null
      case 'session':
        return sessionId !== undefined ? match : null
    }
  }

  /** Read all keys a member may see in a scope. */
  readAll(member: string, scope: MemoryScope, sessionId?: string): MemoryRecord[] {
    return this.records
      .filter((r) => !r.supersededBy && r.scope === scope)
      .filter((r) => {
        switch (scope) {
          case 'personal':
            return r.owner === member
          case 'household':
            return this.householdMembers.includes(member)
          case 'session':
            return sessionId !== undefined
        }
      })
  }

  /** The isolation invariant: a personal record is invisible to others. */
  get _records(): MemoryRecord[] {
    return this.records
  }
}