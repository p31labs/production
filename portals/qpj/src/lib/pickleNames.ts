export function cyrb128(str: string): () => number {
  let h1 = 1779033703 ^ str.length;
  let h2 = 3144134277 ^ str.length;
  let h3 = 1013904242 ^ str.length;
  let h4 = 2773480762 ^ str.length;

  for (let i = 0, k = 0; i < str.length; i++, k = i % 16) {
    const ch = str.charCodeAt(i);
    if (k === 0) { h1 = h2 ^ Math.imul(h1 ^ ch, 597399067); }
    else if (k === 1) { h2 = h3 ^ Math.imul(h2 ^ ch, 2869860233); }
    else if (k === 2) { h3 = h4 ^ Math.imul(h3 ^ ch, 951274213); }
    else { h4 = h1 ^ Math.imul(h4 ^ ch, 2716044179); }
    h1 = h1 ^ (h4 >>> 18);
    h2 = h2 ^ (h1 >>> 22);
    h3 = h3 ^ (h2 >>> 17);
    h4 = h4 ^ (h3 >>> 19);
  }

  return () => {
    h1 = h2 ^ Math.imul(h1 ^ (h1 >>> 18), 2246822507);
    h2 = h3 ^ Math.imul(h2 ^ (h2 >>> 22), 3266489909);
    h3 = h4 ^ Math.imul(h3 ^ (h3 >>> 17), 3266489909);
    h4 = h1 ^ Math.imul(h4 ^ (h4 >>> 19), 2246822507);
    let t = h1 ^ (h1 >>> 10);
    t = t ^ Math.imul(t, 69069);
    t = t ^ (t >>> 25);
    return ((t >>> 0) / 4294967296);
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

export interface PickleNameOptions {
  seed?: string;
  exclude?: Set<string>;
}

export function generatePickleName(input: string, opts?: PickleNameOptions): string {
  const PREFIXES = [
    'Dill', 'Bread', 'Corn', 'Gherkin', 'Half', 'Sour',
    'Jar', 'Brine', 'Ferment', 'Crisp', 'Tang', 'Salt',
    'Pickle', 'Snap', 'Crunch', 'Dill', 'Sweet', 'Sour',
    'Seed', 'Rind', 'Vine', 'Bloom', 'Sprout', 'Cultch',
  ];
  const SUFFIXES = [
    'quiet', 'quick', 'warm', 'slow', 'bright', 'deep',
    'high', 'soft', 'sharp', 'round', 'little', 'long',
    'still', 'bright', 'cool', 'dawn', 'rare', 'wild',
    'tide', 'sift', 'lark', 'moss', 'fern', 'drift',
  ];

  const exclude = opts?.exclude ?? new Set<string>();
  const rand = mulberry32(hashStr(input));

  let attempts = 0;
  while (attempts < 200) {
    const p = PREFIXES[Math.floor(rand() * PREFIXES.length)];
    const s = SUFFIXES[Math.floor(rand() * SUFFIXES.length)];
    const name = `${p}·${s}`;
    if (!exclude.has(name)) return name;
    attempts++;
  }

  return `Pickle·${Math.floor(rand() * 9999)}`;
}

export function generatePickleNames(input: string, count: number, opts?: PickleNameOptions): string[] {
  const exclude = opts?.exclude ?? new Set<string>();
  const existing = new Set<string>(exclude);
  const names: string[] = [];
  const seed = opts?.seed ?? input;

  for (let i = 0; i < count; i++) {
    const candidate = generatePickleName(`${seed}-${i}`, { exclude, seed });
    existing.add(candidate);
    names.push(candidate);
  }

  return names;
}
