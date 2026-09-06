interface QuickChatButtonProps {
  message: string;
  emoji: string;
  onClick: (message: string) => void;
}

export default function QuickChatButton({ message, emoji, onClick }: QuickChatButtonProps) {
  return (
    <button
      className="button secondary"
      style={{ fontSize: 'var(--p31-type-body)', padding: 'var(--p31-space-sm) var(--p31-space-md)' }}
      onClick={() => onClick(message)}
    >
      {emoji} {message}
    </button>
  );
}
