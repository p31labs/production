/**
 * postcss.config.mjs — Tailwind CSS v4 wiring (Astro v6).
 *
 * Replaces the retired @astrojs/tailwind integration: the @tailwindcss/postcss
 * plugin expands `@import "tailwindcss"` in tailwind.build.css (imported by
 * src/styles/global.css) with the v4 theme + utilities. Content scanning is
 * pinned by `@source` directives in tailwind.build.css rather than a JS
 * config file. The v3 configs (tailwind.config.mjs, tailwind.build.config.cjs)
 * are kept on disk for archaeology but are no longer loaded.
 *
 * NOTE: @tailwindcss/vite was deliberately NOT used — it is incompatible with
 * Astro's rolldown-vite build (withastro/astro#16542).
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};