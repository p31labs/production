/**
 * SuggestionBlock — accept/reject UI for a single edit suggestion.
 */

import { Button } from '@p31ca/design-core/compositions';

export interface Suggestion {
  suggestionId: string;
  replacement: string;
}

interface SuggestionBlockProps {
  suggestion: Suggestion;
  onAccept: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
}

export function SuggestionBlock({ suggestion, onAccept, onReject }: SuggestionBlockProps) {
  return (
    <div className="pages-suggestion">
      <div className="pages-suggestion__replacement">{suggestion.replacement}</div>
      <div className="pages-suggestion__actions">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onAccept(suggestion.suggestionId)}
        >
          Accept
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onReject(suggestion.suggestionId)}>
          Reject
        </Button>
      </div>
    </div>
  );
}