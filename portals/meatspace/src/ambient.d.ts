/**
 * Ambient declarations for @p31/ui (vendored portal tarball) sources: the
 * vendored ui imports .astro layouts and the untyped `qrcode` package. These
 * declarations let the meatspace tsc program type-check the vendored source.
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