declare module '@xenova/transformers' {
  export interface FeatureExtractionOutput {
    data: Float32Array | number[];
  }

  export interface Pipeline {
    (text: string, options?: { pooling?: string; normalize?: boolean }): Promise<FeatureExtractionOutput>;
  }

  export function pipeline(
    task: string,
    model: string,
    options?: { quantized?: boolean },
  ): Promise<Pipeline>;
}
