<!-- P31-HEADER
id: p31_template_astro_surface_sitecfg_20261013_v1.0
type: template
component: templates/astro-surface
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

/**
 * BLUEPRINT ONLY — not runnable.
 * Site-level config: everything a surface decides ONCE, at the site level.
 * Page files read from here; they never invent their own widths, nav, or
 * alignment policy (PAGE-CONTRACTS C1–C4, H3).
 */
export const site = {
  title: 'P31 Labs',
  /** The reference center list — the ONLY pages allowed data-align="center". */
  centeredHeaders: ['/', '/research', '/arcade'],
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about/' },
    { label: 'Team', href: '/team/' },
    { label: 'FAQ', href: '/faq/' },
  ],
};

/**
 * Page-max and header-height are TOKENS, not site config — they live in the
 * DTCG core (p31.page-max, p31.header-height) and arrive here as CSS vars:
 *   --p31-page-max: 80rem;
 *   --p31-header-height: 4rem;
 * A surface that re-declares them is a token fork (token-inventory.md drift
 * rows 15–16). The shell layout consumes the vars; this file must not.
 */
export const pageMax = 'var(--p31-page-max)'; // reference only — never hardcode 80rem in CSS