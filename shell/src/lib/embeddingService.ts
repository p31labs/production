import { pipeline } from '@xenova/transformers';

let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
  }
  return embedder;
}

export async function computeEmbedding(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const result = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data) as number[];
}

export async function computeEmbeddingSafe(text: string): Promise<number[] | null> {
  try {
    return await computeEmbedding(text);
  } catch (error) {
    console.warn('[Embedding] Failed:', error);
    return null;
  }
}

export async function computeBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await getEmbedder();
  const results = await Promise.all(
    texts.map(text => model(text, { pooling: 'mean', normalize: true }))
  );
  return results.map(r => Array.from(r.data) as number[]);
}
