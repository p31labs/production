import * as Y from 'yjs';
import type { CommentThread } from '../lib/commentStore';

export type ResolvedAnchor =
  | { state: 'resolved'; index: number; length: number }
  | { state: 'orphaned' }
  | { state: 'pending' };

function b64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function b64d(input: string): Uint8Array {
  const bin = atob(input);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export function anchorRange(
  ytext: Y.Text,
  index: number,
  length: number,
): { anchorStart: string; anchorEnd: string; quoted: string } {
  const anchorStart = b64(
    Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(ytext, index, -1)),
  );
  const anchorEnd = b64(
    Y.encodeRelativePosition(
      Y.createRelativePositionFromTypeIndex(ytext, index + length, 1),
    ),
  );
  const quoted = ytext.toString().slice(index, index + length);
  return { anchorStart, anchorEnd, quoted };
}

export function resolveAnchor(thread: CommentThread, doc: Y.Doc): ResolvedAnchor {
  let startRel: Y.RelativePosition;
  let endRel: Y.RelativePosition;
  try {
    startRel = Y.decodeRelativePosition(b64d(thread.anchorStart));
    endRel = Y.decodeRelativePosition(b64d(thread.anchorEnd));
  } catch {
    return { state: 'orphaned' };
  }

  let start: Y.AbsolutePosition | null;
  let end: Y.AbsolutePosition | null;
  try {
    start = Y.createAbsolutePositionFromRelativePosition(startRel, doc, false);
    end = Y.createAbsolutePositionFromRelativePosition(endRel, doc, false);
  } catch {
    return { state: 'pending' };
  }

  if (start === null || end === null) {
    return { state: 'orphaned' };
  }

  if (!(start.type instanceof Y.Text) || start.type !== end.type) {
    return { state: 'orphaned' };
  }

  const resolved = start.type.toString().slice(start.index, end.index);
  if (resolved !== thread.quoted) {
    return { state: 'orphaned' };
  }

  return { state: 'resolved', index: start.index, length: end.index - start.index };
}