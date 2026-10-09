import { createDefaultConstitution, type Constitution } from '@p31ca/rules';

let _constitution: Constitution | null = null;

export function getConstitution(): Constitution {
  if (!_constitution) {
    _constitution = createDefaultConstitution();
  }
  return _constitution;
}

export function resetConstitution(): void {
  _constitution = null;
}
