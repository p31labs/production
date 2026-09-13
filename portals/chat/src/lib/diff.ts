export type DiffLine = { type: 'added' | 'removed' | 'same'; text: string };

export function myersDiff(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Array<number>(2 * max + 1).fill(0);
  const trace: number[][] = [];
  let found = false;

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  let x = n;
  let y = m;
  const ops: DiffLine[] = [];

  for (let d = trace.length - 1; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && vPrev[offset + k - 1] < vPrev[offset + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = vPrev[offset + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      ops.push({ type: 'same', text: a[x - 1] });
      x--;
      y--;
    }
    if (x === prevX && y > prevY) {
      ops.push({ type: 'added', text: b[y - 1] });
      y--;
    } else if (y === prevY && x > prevX) {
      ops.push({ type: 'removed', text: a[x - 1] });
      x--;
    }
  }

  while (x > 0 && y > 0) {
    ops.push({ type: 'same', text: a[x - 1] });
    x--;
    y--;
  }
  while (y > 0) {
    ops.push({ type: 'added', text: b[y - 1] });
    y--;
  }
  while (x > 0) {
    ops.push({ type: 'removed', text: a[x - 1] });
    x--;
  }

  ops.reverse();
  return ops;
}

export function diffTexts(prev: string, curr: string): DiffLine[] {
  return myersDiff(linesOf(prev), linesOf(curr));
}

function linesOf(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}
