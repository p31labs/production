import StreamingText from '../../components/StreamingText';
import ToolChip from './ToolChip';
import type { Message as MessageType } from './sandboxStore';

interface ChatMessageProps {
  message: MessageType;
  isStreaming: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`chat-msg chat-msg--${message.role}`}>
      <div className="chat-msg-bubble" tabIndex={0} role="article" aria-label={`Message from ${message.role}`}>
        {isStreaming ? (
          <StreamingText text={message.content} isStreaming={isStreaming} />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</span>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ marginTop: 'var(--p31-space-tiny)' }}>
            {message.toolCalls.map((tc) => (
              <ToolChip key={tc.id} event={tc} />
            ))}
          </div>
        )}
      </div>
      <span className="chat-msg-time">{isUser ? 'You' : 'Assistant'} · {time}</span>
    </div>
  );
}
