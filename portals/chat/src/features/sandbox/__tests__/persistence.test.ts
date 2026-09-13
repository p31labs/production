import { describe, it, expect } from 'vitest';
import { computePersistDelta, type PersistSnapshot, type DbRows } from '../artifactPersistence';
import type { Thread, Message, Artifact } from '../types';

const thread = (id: string, updatedAt = 1): Thread => ({ id, title: id, lastMessage: '', createdAt: 0, updatedAt, lastViewedAt: 0 });
const message = (id: string, threadId: string): Message & { threadId: string } => ({ id, threadId, role: 'user', content: id, timestamp: 0 });
const artifact = (id: string, threadId: string): Artifact & { threadId: string } => ({
  id,
  threadId,
  title: id,
  code: '<div>',
  html: '<div>',
  versions: [{ code: '<div>', html: '<div>', timestamp: 0 }],
  createdAt: 0,
});

const emptyDb: DbRows = { threads: [], messages: [], artifacts: [] };

describe('computePersistDelta', () => {
  it('writes every in-memory row that is not already present', () => {
    const snapshot: PersistSnapshot = {
      threads: [thread('t1')],
      messages: { t1: [message('m1', 't1')] },
      artifacts: { t1: [artifact('a1', 't1')] },
    };
    const delta = computePersistDelta(snapshot, emptyDb);
    expect(delta.writes).toHaveLength(2);
    expect(delta.writes.map((w) => w.row.id).sort()).toEqual(['a1', 'm1']);
    expect(delta.deletes).toHaveLength(0);
  });

  it('writes idempotently when the DB already mirrors the snapshot (no orphan deletions)', () => {
    const snapshot: PersistSnapshot = {
      threads: [thread('t1')],
      messages: { t1: [message('m1', 't1')] },
      artifacts: { t1: [artifact('a1', 't1')] },
    };
    const db: DbRows = {
      threads: [thread('t1')],
      messages: [message('m1', 't1')],
      artifacts: [artifact('a1', 't1')],
    };
    const delta = computePersistDelta(snapshot, db);
    expect(delta.writes.map((w) => w.row.id).sort()).toEqual(['a1', 'm1']);
    expect(delta.deletes).toHaveLength(0);
  });

  it('deletes a removed thread and its orphaned rows in the DB', () => {
    const snapshot: PersistSnapshot = { threads: [], messages: {}, artifacts: {} };
    const db: DbRows = {
      threads: [thread('t1')],
      messages: [message('m1', 't1')],
      artifacts: [artifact('a1', 't1')],
    };
    const delta = computePersistDelta(snapshot, db);
    expect(delta.writes).toHaveLength(0);
    expect(delta.deletes).toContainEqual({ kind: 'thread', id: 't1' });
    expect(delta.deletes).toContainEqual({ kind: 'message', id: 'm1' });
    expect(delta.deletes).toContainEqual({ kind: 'artifact', id: 'a1' });
  });

  it('deletes rows trimmed by the history/version cap', () => {
    const snapshot: PersistSnapshot = {
      threads: [thread('t1')],
      messages: { t1: [message('m2', 't1')] },
      artifacts: { t1: [artifact('a2', 't1')] },
    };
    const db: DbRows = {
      threads: [thread('t1')],
      messages: [message('m1', 't1'), message('m2', 't1')],
      artifacts: [artifact('a1', 't1'), artifact('a2', 't1')],
    };
    const delta = computePersistDelta(snapshot, db);
    expect(delta.deletes).toContainEqual({ kind: 'message', id: 'm1' });
    expect(delta.deletes).toContainEqual({ kind: 'artifact', id: 'a1' });
    expect(delta.deletes).not.toContainEqual({ kind: 'thread', id: 't1' });
  });

  it('keeps rows from untouched threads intact', () => {
    const snapshot: PersistSnapshot = {
      threads: [thread('t1'), thread('t2')],
      messages: { t1: [], t2: [message('m2', 't2')] },
      artifacts: { t1: [], t2: [artifact('a2', 't2')] },
    };
    const db: DbRows = {
      threads: [thread('t1'), thread('t2')],
      messages: [message('m2', 't2')],
      artifacts: [artifact('a2', 't2')],
    };
    const delta = computePersistDelta(snapshot, db);
    expect(delta.writes.map((w) => w.row.id).sort()).toEqual(['a2', 'm2']);
    expect(delta.deletes).toHaveLength(0);
  });
});
