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
      {isUser ? (
        <div className="chat-msg-bubble" tabIndex={0} role="article" aria-label="User message">
          <span className="chat-msg-text">{message.content}</span>
        </div>
      ) : (
        <div className="chat-msg-content" tabIndex={0} role="article" aria-label="Assistant message">
          {isStreaming ? (
            <StreamingText text={message.content} isStreaming={isStreaming} />
          ) : (
            <span className="chat-msg-text">{message.content}</span>
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
    </div>
  );
}
