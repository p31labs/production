/**
 * Renderer factory — WebGPU-first with WebGL2 fallback.
 *
 * WebGPU reached Baseline in January 2026 (Chrome, Edge, Firefox, Safari 26);
 * ≈70–75% of users have it. Three.js's WebGPURenderer is the modern path
 * (storage buffers, compute shaders). This factory feature-detects and returns
 * the best available renderer:
 *   - navigator.gpu present  → WebGPURenderer
 *   - otherwise              → WebGLRenderer
 *
 * The Bloom post-processing path (@react-three/postprocessing v3) works with
 * both renderers; powerPreference is passed through to whichever is selected.
 */
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

export function isWebGPUAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    typeof (navigator as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu?.requestAdapter === 'function'
  );
}

export interface RendererFactoryProps {
  canvas: HTMLCanvasElement;
  powerPreference?: string;
  antialias?: boolean;
}

/**
 * Renderer factory for <Canvas gl={...}>. R3F calls it with the Canvas props;
 * the returned instance is the active renderer. A single code path keeps the
 * scene (instanced dome, NeoPixel frame, Bloom) renderer-agnostic.
 */
export function createRenderer(webgpu = isWebGPUAvailable()) {
  return (props: RendererFactoryProps) => {
    const canvas = props.canvas;
    const powerPreference = props.powerPreference ?? 'high-performance';
    const antialias = props.antialias !== false;

    if (webgpu) {
      return new WebGPURenderer({
        canvas,
        antialias,
        powerPreference,
      } as never);
    }
    return new THREE.WebGLRenderer({ canvas, antialias, powerPreference } as never);
  };
}

export const RENDERER_KIND = isWebGPUAvailable() ? 'webgpu' : 'webgl2';
export const RENDERER_LABEL = RENDERER_KIND === 'webgpu' ? 'WebGPU' : 'WebGL2';