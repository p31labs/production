import { useEffect, useRef, useState } from 'react';
import StreamingText from '../../components/StreamingText';
import ToolChip from './ToolChip';
import { useSandboxStore } from './sandboxStore';
import type { Message as MessageType } from './sandboxStore';

interface ChatMessageProps {
  message: MessageType;
  isStreaming: boolean;
}

type ToneKind = 'explanation' | 'question' | 'suggestion' | 'warning';
type Flash = 'copied' | 'queued' | null;

const TONE_META: Record<ToneKind, string> = {
  explanation: 'Explanation',
  question: 'Question',
  suggestion: 'Suggestion',
  warning: 'Warning',
};

const TONE_PATTERN = /(explanation|question|suggestion|warning)/i;

function extractTone(content: string): { kind: ToneKind | null; display: string } {
  const head = content.slice(0, 24);
  const headMatch = head.match(new RegExp(`^\\s*\\[${TONE_PATTERN.source}\\]\\s*`, 'i'));
  if (headMatch) {
    const kind = headMatch[1].toLowerCase() as ToneKind;
    const idx = content.toLowerCase().indexOf(`[${headMatch[1].toLowerCase()}]`);
    return { kind, display: content.slice(idx + kind.length + 2).trimStart() };
  }

  const tail = content.trim().slice(-24);
  const tailMatch = tail.match(new RegExp(`\\[${TONE_PATTERN.source}\\]\\s*$`, 'i'));
  if (tailMatch) {
    const kind = tailMatch[1].toLowerCase() as ToneKind;
    const idx = content.toLowerCase().lastIndexOf(`[${tailMatch[1].toLowerCase()}]`);
    return { kind, display: content.slice(0, idx).trimEnd() };
  }

  return { kind: null, display: content };
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // clipboard API unavailable or rejected — fall through to legacy path
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const toneLabels = useSandboxStore((s) => s.toneLabels);
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [flash, setFlash] = useState<Flash>(null);
  const flashTimer = useRef<number | null>(null);

  const { kind, display } = isUser || !toneLabels ? { kind: null, display: message.content } : extractTone(message.content);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  function triggerFlash(kind: Flash) {
    setFlash(kind);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1200);
  }

  async function handleCopy() {
    const ok = await copyToClipboard(message.content);
    if (ok) triggerFlash('copied');
  }

  function handleRegenerate() {
    useSandboxStore.getState().regenerate(message.id);
  }

  function handleEdit() {
    useSandboxStore.getState().queuePrompt(message.content);
    triggerFlash('queued');
  }

  return (
    <div className={`chat-msg chat-msg--${message.role}`}>
      {isUser ? (
        <div className="chat-msg-bubble" tabIndex={0} role="article" aria-label="User message">
          <span className="chat-msg-text">{message.content}</span>
        </div>
      ) : (
        <div className="chat-msg-content" tabIndex={0} role="article" aria-label="Assistant message">
          {kind && (
            <span className={`chat-msg-tone chat-msg-tone--${kind}`}>{TONE_META[kind]}</span>
          )}
          {isStreaming ? (
            <StreamingText text={display} isStreaming={isStreaming} />
          ) : (
            <span className="chat-msg-text">{display}</span>
          )}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="chat-msg-tools">
              {message.toolCalls.map((tc) => (
                <ToolChip key={tc.id} event={tc} />
              ))}
            </div>
          )}
        </div>
      )}
      <span className="chat-msg-time">{isUser ? 'You' : 'Assistant'} · {time}</span>
      <div className="chat-msg-actions">
        {isUser ? (
          <>
            <button type="button" className="chat-msg-actions__btn" aria-label="Copy message" onClick={handleCopy}>
              {flash === 'copied' ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="chat-msg-actions__btn" aria-label="Edit message" onClick={handleEdit}>
              {flash === 'queued' ? 'Queued' : 'Edit'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="chat-msg-actions__btn" aria-label="Copy response" onClick={handleCopy}>
              {flash === 'copied' ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="chat-msg-actions__btn" aria-label="Regenerate response" onClick={handleRegenerate}>
              Regenerate
            </button>
          </>
        )}
      </div>
    </div>
  );
}