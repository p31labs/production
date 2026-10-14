/**
 * SUPERSEDED (2026-10-12, Astro v6 migration) — do not re-wire this file.
 *
 * The retired @astrojs/tailwind integration loaded this Tailwind v3 config.
 * Tailwind CSS v4 is now wired CSS-first:
 *   - postcss.config.mjs        → @tailwindcss/postcss plugin
 *   - tailwind.build.css        → @import "tailwindcss" + @theme mapping
 *   - src/styles/global.css     → imports tailwind.build.css
 *
 * All tokens from the old p31Preset (@p31ca/shared/theme/tailwind-preset) and
 * the hubRose/hubNav accents are mirrored in the @theme block in
 * tailwind.build.css. The file is kept on disk per the no-delete rule; it is
 * no longer loaded by anything (v4 ignores JS configs without an explicit
 * `@config` directive).
 */
export default {};