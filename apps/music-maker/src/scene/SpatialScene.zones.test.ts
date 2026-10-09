/**
 * SpatialScene — zone registration helpers.
 *
 * The historical "place a zone shows the counter but no star appears" bug was
 * the missing half of the MusicZone → onReady handoff: the Points were stored
 * in the map but never added to the scene. registerZone/unregisterZone pin the
 * scene-graph half — no WebGL needed, just a THREE.Scene and a THREE.Points.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { registerZone, unregisterZone } from './SpatialScene';

function makePoints(): THREE.Points {
  return new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
}

describe('registerZone', () => {
  it('adds the zone Points to the scene graph AND the map, tagged for raycast', () => {
    const scene = new THREE.Scene();
    const map = new Map<string, THREE.Points>();
    const points = makePoints();
    registerZone(scene, map, points, 'z1');
    expect(map.get('z1')).toBe(points);
    expect(scene.children).toContain(points);
    expect(points.userData.zoneId).toBe('z1');
  });

  it('is idempotent per id — no duplicate scene child', () => {
    const scene = new THREE.Scene();
    const map = new Map<string, THREE.Points>();
    const points = makePoints();
    registerZone(scene, map, points, 'z1');
    registerZone(scene, map, points, 'z1');
    expect(scene.children.filter((c) => c === points)).toHaveLength(1);
  });
});

describe('unregisterZone', () => {
  it('removes the zone from both the scene and the map', () => {
    const scene = new THREE.Scene();
    const map = new Map<string, THREE.Points>();
    const points = makePoints();
    registerZone(scene, map, points, 'z1');
    unregisterZone(scene, map, 'z1');
    expect(map.has('z1')).toBe(false);
    expect(scene.children).not.toContain(points);
  });

  it('is a safe no-op for an unknown id', () => {
    const scene = new THREE.Scene();
    const map = new Map<string, THREE.Points>();
    expect(() => unregisterZone(scene, map, 'ghost')).not.toThrow();
  });
});