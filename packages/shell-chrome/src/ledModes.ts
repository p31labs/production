/**
 * ledModes — the ONE LED mode registry for the sovereign shell.
 *
 * Two-tier vocabulary, both tiers live here and nowhere else:
 *
 *  1. `LED_MODES` — the professional-clean UI modes (the four modes the
 *     shell's chrome surfaces offer the user).
 *  2. `LED_MODE_MAP` — the full shader index map, parity-locked to
 *     spaceship-earth's NeoPixelFrame fragment shader (uMode indices).
 *     The shell's ledModes.test.ts asserts this map `toEqual` the shader's
 *     exact indices, so the registry can never silently drift from the dome.
 *
 * `ledUniformsFor` converts a `LedSource` (the state shape the shell and the
 * dome already share) into the uniform object the NeoPixelFrame material
 * consumes — same math: speed/10, brightness/100, palette slots with the
 * shader's own fallbacks (`#ff9944` / `#22d3ee`), plus the `frozen` flag.
 *
 * UI-mode aliases: `pulse` drives the breath shader (index 3) — the dome's
 * breathing/pulse waveform. Everything else in LED_MODE_MAP is addressable
 * directly by its shader name.
 */

/** The four professional-clean UI modes. */
export const LED_MODES = ['rainbow', 'pulse', 'solid', 'off'] as const;

/** Shader index map — parity with packages/spaceship-earth/src/cockpit/NeoPixelFrame.tsx. */
export const LED_MODE_MAP: Record<string, number> = {
  rainbow: 0,
  chase: 1,
  solid: 2,
  breath: 3,
  gradient: 4,
  'dual-chase': 5,
  off: 6,
};

/** UI mode → shader index binding. `pulse` drives the breath waveform. */
const UI_MODE_SHADER: Record<(typeof LED_MODES)[number], number> = {
  rainbow: 0,
  pulse: 3,
  solid: 2,
  off: 6,
};

export type LedUiMode = (typeof LED_MODES)[number];
export type LedShaderMode = keyof typeof LED_MODE_MAP;
/** A mode accepted by the registry: any UI mode or any shader mode. */
export type LedMode = LedUiMode | LedShaderMode;

/** The LED state shape shared by the shell store and the dome renderer. */
export interface LedSource {
  mode: LedMode;
  speed: number;
  color: string;
  brightness: number;
  colors: string[];
}

/** The uniform object the NeoPixelFrame ShaderMaterial consumes. */
export interface LedUniforms {
  mode: number;
  speed: number;
  brightness: number;
  color1: string;
  color2: string;
  frozen: 0 | 1;
}

/** Default palette slots — identical to the shader's own `??` fallbacks. */
const DEFAULT_PALETTE = ['#ff9944', '#22d3ee'] as const;

/** Convert a LedSource into NeoPixelFrame uniforms (shader-parity math). */
export function ledUniformsFor(source: LedSource, frozen = false): LedUniforms {
  return {
    mode:
      source.mode in LED_MODE_MAP
        ? LED_MODE_MAP[source.mode]
        : (UI_MODE_SHADER[source.mode as LedUiMode] ?? 0),
    speed: source.speed / 10,
    brightness: source.brightness / 100,
    color1: source.colors?.[0] ?? DEFAULT_PALETTE[0],
    color2: source.colors?.[1] ?? DEFAULT_PALETTE[1],
    frozen: frozen ? 1 : 0,
  };
}