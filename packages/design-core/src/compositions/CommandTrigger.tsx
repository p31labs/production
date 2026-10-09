
export interface CommandTriggerProps {
  /** Placeholder text. */
  placeholder?: string;
  /** OS-correct modifier hint. Defaults to ⌘K (macOS) / Ctrl K (elsewhere). */
  shortcut?: string;
  /** Fired when the trigger is activated — wire to your command palette. */
  onOpen?: () => void;
  /** Compact (icon-only) rendering for narrow bars. */
  compact?: boolean;
  className?: string;
}

/**
 * CommandTrigger — the topbar search affordance.
 *
 * Rendered as a button, not an input, so the keyboard hint is a visual
 * affordance only; the real command palette is wired via `onOpen`. Use this
 * as the `center` slot for app-chrome topbars.
 */
export function CommandTrigger({
  placeholder = 'Search or jump to…',
  shortcut,
  onOpen,
  compact = false,
  className = '',
}: CommandTriggerProps) {
  // OS-correct hint: ⌘K on macOS, Ctrl K elsewhere. A provided `shortcut`
  // wins; otherwise detect. Server-render safe (navigator undefined).
  const hint =
    shortcut ??
    (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘K' : 'Ctrl K');
  return (
    <button
      type="button"
      className={`command-trigger ${compact ? 'command-trigger--compact' : ''} ${className}`.trim()}
      onClick={onOpen}
      aria-label={placeholder}
    >
      <span className="command-trigger__icon" aria-hidden="true">⌕</span>
      {!compact && <span className="command-trigger__label">{placeholder}</span>}
      {!compact && <kbd className="command-trigger__kbd">{hint}</kbd>}
    </button>
  );
}

export default CommandTrigger;