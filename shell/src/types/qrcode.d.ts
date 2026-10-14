declare module 'qrcode' {
  interface QRCodeRenderersOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high';
    color?: { dark?: string; light?: string };
  }
  interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high';
    color?: { dark?: string; light?: string };
  }
  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;
  // Mirror of the real @types/qrcode API for the toCanvas renderer used by
  // @p31ca/ui/passport/QRDisplay.tsx (canvasElement, text, options, callback).
  export function toCanvas(
    canvasElement: HTMLCanvasElement,
    text: string,
    options?: QRCodeRenderersOptions,
    callback?: (error: Error | null | undefined) => void
  ): void;
}