/**
 * @p31ca/design-core — shell/SearchBox.tsx
 *
 * The centered command-palette search trigger — the canonical middle slot of
 * the shared topbar shape. Renders a search affordance with a ⌘K keycap.
 * Pure props: the face supplies the placeholder and the open handler.
 */

export interface SearchBoxProps {
  placeholder: string;
  onOpen?: () => void;
  className?: string;
}

export function SearchBox({ placeholder, onOpen, className = '' }: SearchBoxProps) {
  return (
    <button type="button" className={`search-box ${className}`.trim()} onClick={onOpen} aria-label={`Search: ${placeholder}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span className="search-box__placeholder">{placeholder}</span>
      <kbd className="search-kbd">⌘K</kbd>
    </button>
  );
}

export default SearchBox;