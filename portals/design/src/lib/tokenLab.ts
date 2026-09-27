/**
 * tokenLab — live CSS-variable editing with export (DTCG / CSS / JSON).
 * The single most impressive surface: edit a --p31-* token → preview streams
 * live → export to standards. Mirrors the WaveMaker / Cadence model.
 */
import { useSessionStore } from './useSessionStore';
export interface TokenEdit {
  name: string; // '--p31-accent-cyan'
  original: string;
  current: string;
}

const STORAGE = 'p31.design.tokenLab.v1';

export function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function writeToken(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value);
  useSessionStore.getState().countTokenEdit();
}

export function resetToken(name: string): void {
  document.documentElement.style.removeProperty(name);
}

export function exportCss(edits: TokenEdit[]): string {
  return `:root {\n${edits.map((e) => `  ${e.name}: ${e.current};`).join('\n')}\n}\n`;
}

export function exportJson(edits: TokenEdit[]): string {
  return JSON.stringify(Object.fromEntries(edits.map((e) => [e.name, e.current])), null, 2);
}

export function exportDtcg(edits: TokenEdit[]): string {
  const group: Record<string, { $value: string; $type: string }> = {};
  for (const e of edits) {
    const key = e.name.replace(/^--/, '').split('-').slice(1).join('-') || e.name;
    group[key] = { $value: e.current, $type: e.current.startsWith('oklch') ? 'color' : 'string' };
  }
  return JSON.stringify(
    { $schema: 'https://design-tokens.github.io/community-group/format/', group },
    null,
    2,
  );
}

export function persist(edits: TokenEdit[]): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(edits));
  } catch {
    /* private mode */
  }
}

export function loadPersisted(): TokenEdit[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const e of parsed) writeToken(e.name, e.current);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** A curated set of the editable accent/neutral tokens (for the lab). */
export const EDITABLE_TOKENS = [
  '--p31-accent',
  '--p31-accent-alt',
  '--p31-accent-red',
  '--p31-accent-green',
  '--p31-accent-violet',
  '--p31-accent-gold',
  '--p31-accent-cyan',
  '--p31-bg',
  '--p31-surface',
  '--p31-surface2',
  '--p31-glass-bg',
  '--p31-glass-border',
] as const;