<!-- P31-HEADER
id: p31_template_astro_surface_config_20261013_v1.0
type: template
component: templates/astro-surface
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

// BLUEPRINT ONLY — not a runnable config.
// The single global CSS import lives in the layout, NOT here; this file
// keeps build concerns (output, adapter, trailing slash) in one place.
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
  trailingSlash: 'always', // canonical URLs — no 301 hop on the router fetch
});