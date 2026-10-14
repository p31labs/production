/**
 * @p31ca/canon-parts — recipes.mjs
 *
 * Class-string builders shared by BOTH wrapper worlds (fix-plan
 * p31ca-phase2-wrappers-2026-10-13 §2.1). Pure string logic — no React, no
 * Astro, no CSS parsing. The classes point at recipes.css
 * (@layer canon.components); values never appear here (values are tokens).
 */

/** Button class recipe: `.p31-btn` + data-driven variant/size. */
export function btnClass({ variant = 'primary', size = 'md' } = {}) {
  return 'p31-btn';
}

/** Button recipe data attrs (the variant/size ride as data attributes). */
export function btnData({ variant = 'primary', size = 'md' } = {}) {
  return { 'data-variant': variant, 'data-size': size };
}

/** Card class recipe. */
export function cardClass() {
  return 'p31-card';
}

/** Badge class recipe + tone attribute. */
export function badgeClass() {
  return 'p31-badge';
}

export function badgeData({ tone = 'accent' } = {}) {
  return { 'data-tone': tone };
}

/** Field class recipe + width attribute. */
export function fieldClass() {
  return 'p31-field';
}

export function fieldData({ width = 'full' } = {}) {
  return width === 'form' ? { 'data-width': 'form' } : {};
}

/** Field child classes (label/hint/error) — consumed inside [data-p31=field]. */
export function fieldLabelClass() {
  return 'p31-field-label';
}

export function fieldHintClass() {
  return 'p31-field-hint';
}

export function fieldErrorClass() {
  return 'p31-field-error';
}

/** Page-header class recipe. */
export function pageHeaderClass() {
  return 'p31-page-header';
}

export function pageHeaderTitleClass() {
  return 'p31-page-header-title';
}

export function pageHeaderSubtitleClass() {
  return 'p31-page-header-subtitle';
}

/** Grid class recipe + min-floor attribute. */
export function gridClass() {
  return 'p31-grid';
}

export function gridData({ min = 'md' } = {}) {
  return { 'data-min': min };
}