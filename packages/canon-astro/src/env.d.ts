/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

/**
 * Library-side .astro module declarations (astro sync in this workspace emits
 * .astro/types.d.ts but no per-component declarations — no pages dir).
 * Loose component type: the Astro language server still provides exact prop
 * types to consumers' editors.
 */
declare module '*.astro' {
  const Component: (props: Record<string, unknown>) => unknown;
  export default Component;
}