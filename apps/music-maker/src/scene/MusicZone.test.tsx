/**
 * The music maker — MusicZone tests.
 *
 * Pins the contract with the parent scene: on mount the zone hands a real
 * THREE.Points to onReady (so the parent can register it in the scene graph),
 * and on unmount it calls onDispose. THREE.Points construction needs no WebGL.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { MusicZone } from './MusicZone';

function renderZone(onReady = vi.fn(), onDispose = vi.fn()) {
  return render(
    <MusicZone
      id="z1"
      position={[0.5, 1, 2]}
      accentRgb={[0.1, 0.2, 0.3]}
      goldRgb={[0.9, 0.8, 0.7]}
      onReady={onReady}
      onDispose={onDispose}
    />,
  );
}

describe('MusicZone', () => {
  it('hands a real THREE.Points (at the zone position) to onReady', () => {
    const onReady = vi.fn();
    renderZone(onReady);
    expect(onReady).toHaveBeenCalledTimes(1);
    const points = onReady.mock.calls[0][0] as THREE.Points;
    expect(points).toBeInstanceOf(THREE.Points);
    expect(points.position.toArray()).toEqual([0.5, 1, 2]);
    expect(onReady.mock.calls[0][1]).toBe('z1');
  });

  it('calls onDispose when unmounted', () => {
    const onReady = vi.fn();
    const onDispose = vi.fn();
    const { unmount } = renderZone(onReady, onDispose);
    unmount();
    expect(onDispose).toHaveBeenCalledWith('z1');
  });

  it('renders no DOM (it registers a Points with the parent scene)', () => {
    const { container } = renderZone();
    expect(container.childNodes).toHaveLength(0);
  });
});