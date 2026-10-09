import type { CommentThread } from '../lib/commentStore';

export interface CommentThreadProps {
  thread: CommentThread;
  orphaned?: boolean;
  onResolve?: (thread: CommentThread) => void;
  onReopen?: (thread: CommentThread) => void;
}

export function CommentThread({
  thread,
  orphaned = false,
  onResolve,
  onReopen,
}: CommentThreadProps) {
  const isResolved = thread.state === 'resolved';

  return (
    <article
      className="comment-thread"
      data-state={thread.state}
      data-orphaned={orphaned ? 'true' : 'false'}
    >
      <blockquote className="comment-thread__quote">
        {orphaned ? (
          <span className="comment-thread__orphaned">
            orphaned — original text no longer matches
          </span>
        ) : (
          thread.quoted
        )}
      </blockquote>
      <p className="comment-thread__body">{thread.body}</p>
      <footer className="comment-thread__meta">
        <span>{thread.authorDid}</span>
        {isResolved ? (
          onReopen ? (
            <button type="button" onClick={() => onReopen(thread)}>
              Reopen
            </button>
          ) : null
        ) : onResolve ? (
          <button type="button" onClick={() => onResolve(thread)}>
            Resolve
          </button>
        ) : null}
      </footer>
    </article>
  );
}