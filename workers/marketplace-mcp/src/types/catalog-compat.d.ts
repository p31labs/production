/**
 * Type compatibility shim — DO NOT touch workers/marketplace-catalog/**.
 *
 * workers/marketplace-catalog/src/index.ts imports DurableObjectState,
 * DurableObjectNamespace, and SqlStorage as named exports of
 * 'cloudflare:workers'. @cloudflare/workers-types only declares these as
 * ambient globals, so this augmentation re-exports them to keep the catalog
 * source compiling under this worker's tsconfig.
 *
 * Filed: docs/fix-plans/marketplace-catalog-cloudflare-workers-import.md
 * (the catalog worker's own tsconfig also lacks "types", so its standalone
 * `tsc --noEmit` is broken — out of scope for this workstream, filed there).
 */
declare module 'cloudflare:workers' {
  export import DurableObjectState = DurableObjectState;
  export import DurableObjectNamespace = DurableObjectNamespace;
  export import SqlStorage = SqlStorage;
}