export interface TetraVertices {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  v3: [number, number, number];
  edgeLength: number;
}

export function regularTetra(R: number): TetraVertices {
  const edgeLength = R * Math.sqrt(8 / 3);
  return {
    v0: [0, R, 0],
    v1: [R * Math.sqrt(8 / 9), -R / 3, 0],
    v2: [-R * Math.sqrt(2 / 9), -R / 3, R * Math.sqrt(2 / 3)],
    v3: [-R * Math.sqrt(2 / 9), -R / 3, -R * Math.sqrt(2 / 3)],
    edgeLength,
  };
}

// 12 icosahedron vertices matching THREE.IcosahedronGeometry(r, 0) order
// (PolyhedronGeometry normalizes each vertex to the sphere of radius r).
// Shared by DomeGeometry (posner mode nodes) and QuantumFX (house ring) so
// the decorative neuro-map lands exactly on the real dome geometry.
export function icosahedron12(r = 2.3): [number, number, number][] {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  return raw.map(([x, y, z]) => {
    const len = Math.sqrt(x * x + y * y + z * z);
    const s = r / len;
    return [x * s, y * s, z * s];
  });
}

export function assertRegular(t: TetraVertices, tol = 1e-6): void {
  const d = (a: [number, number, number], b: [number, number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const edges = [
    d(t.v0, t.v1), d(t.v0, t.v2), d(t.v0, t.v3),
    d(t.v1, t.v2), d(t.v1, t.v3), d(t.v2, t.v3),
  ];
  const max = Math.max(...edges);
  const min = Math.min(...edges);
  if (max - min > tol) {
    throw new Error(
      `Tetrahedron irregular: edges range ${min.toFixed(4)}–${max.toFixed(4)} (expected ${t.edgeLength.toFixed(4)})`
    );
  }
}
