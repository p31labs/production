import { useEffect, useState } from 'react';
import { DEFAULT_PRESET, PRESETS, type PresetId, type WidgetId } from '../lib/widgets';

const STORAGE_KEY = 'p31:monetization:widgets:v1';

interface PersistedLayout {
  preset: PresetId;
  /** per-preset reordered widget lists (falls back to the preset defaults) */
  order: Partial<Record<PresetId, WidgetId[]>>;
}

function load(): PersistedLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedLayout>;
      if (parsed && typeof parsed === 'object' && parsed.preset) return { preset: parsed.preset, order: parsed.order ?? {} };
    }
  } catch {
    // storage unavailable — defaults
  }
  return { preset: DEFAULT_PRESET, order: {} };
}

export interface WidgetLayout {
  preset: PresetId;
  setPreset: (p: PresetId) => void;
  /** the ordered widget list for the active preset (custom order or default) */
  widgets: WidgetId[];
  /** move a widget earlier/later within the active preset's list */
  move: (id: WidgetId, dir: -1 | 1) => void;
  reset: () => void;
}

/** Widget cockpit layout — preset + per-preset reorder, persisted to localStorage. */
export function useWidgetLayout(): WidgetLayout {
  const [state, setState] = useState<PersistedLayout>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — in-memory only
    }
  }, [state]);

  const preset = state.preset;
  const defaults = PRESETS.find((p) => p.id === preset)?.widgets ?? [];
  const widgets = state.order[preset] ?? defaults;

  const setPreset = (next: PresetId) => setState((s) => ({ ...s, preset: next }));

  const move = (id: WidgetId, dir: -1 | 1) => {
    setState((s) => {
      const base = PRESETS.find((p) => p.id === s.preset)?.widgets ?? [];
      const list = s.order[s.preset] ?? base;
      const idx = list.indexOf(id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= list.length) return s;
      const next = list.slice();
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return { ...s, order: { ...s.order, [s.preset]: next } };
    });
  };

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState({ preset: DEFAULT_PRESET, order: {} });
  };

  return { preset, setPreset, widgets, move, reset };
}