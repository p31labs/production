import { useRef, useEffect } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export default function StreamingText({ text, isStreaming, className }: StreamingTextProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [text, isStreaming]);

  if (!text) return null;

  return (
    <div className={`${className || ''} streaming-text`}>
      {text}
      {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  );
}
