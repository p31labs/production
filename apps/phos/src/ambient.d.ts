/**
 * Ambient module declarations for dependencies whose type surface is either
 * untyped or resolved by framework tooling (Astro) rather than tsc.
 *
 * @p31ca/ui ships .astro layouts and the untyped `qrcode` package; declaring
 * these here lets the phos tsc program type-check the workspace-linked source
 * of @p31ca/ui without failing module resolution.
 */

declare module '*.astro' {
  const Component: unknown;
  export default Component;
}

declare module 'qrcode' {
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    opts?: unknown,
    cb?: (err: Error | null | undefined) => void,
  ): void;
  export default { toCanvas };
}