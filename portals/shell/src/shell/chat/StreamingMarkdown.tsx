/**
 * shell/chat/StreamingMarkdown.tsx — the streaming markdown renderer.
 *
 * Wraps stream-md's StreamMD, which does block-level incremental parsing:
 * closed blocks are memoized so only the streaming block re-renders, and
 * unclosed inline markup renders speculatively (no flicker when the closer
 * arrives). A drop-in for react-markdown that does not re-parse the whole
 * document on every token.
 */
import { StreamMD } from 'stream-md';

export function StreamingMarkdown({ text }: { text: string }) {
  return <StreamMD text={text} />;
}