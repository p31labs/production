import { describe, it, expect } from 'vitest';
import { myersDiff, diffTexts } from '../diff';

describe('myersDiff', () => {
  it('returns empty for identical inputs', () => {
    const a = ['a', 'b', 'c'];
    expect(myersDiff(a, a)).toEqual([
      { type: 'same', text: 'a' },
      { type: 'same', text: 'b' },
      { type: 'same', text: 'c' },
    ]);
  });

  it('marks everything added when A is empty', () => {
    expect(myersDiff([], ['x', 'y'])).toEqual([
      { type: 'added', text: 'x' },
      { type: 'added', text: 'y' },
    ]);
  });

  it('marks everything removed when B is empty', () => {
    expect(myersDiff(['x', 'y'], [])).toEqual([
      { type: 'removed', text: 'x' },
      { type: 'removed', text: 'y' },
    ]);
  });

  it('handles empty inputs', () => {
    expect(myersDiff([], [])).toEqual([]);
  });

  it('finds a single added line in the middle', () => {
    expect(myersDiff(['a', 'c'], ['a', 'b', 'c'])).toEqual([
      { type: 'same', text: 'a' },
      { type: 'added', text: 'b' },
      { type: 'same', text: 'c' },
    ]);
  });

  it('finds a single removed line in the middle', () => {
    expect(myersDiff(['a', 'b', 'c'], ['a', 'c'])).toEqual([
      { type: 'same', text: 'a' },
      { type: 'removed', text: 'b' },
      { type: 'same', text: 'c' },
    ]);
  });

  it('matches the longer identical run over a shorter one (greedy snake)', () => {
    const a = ['same1', 'same2', 'old', 'same3'];
    const b = ['same1', 'same2', 'same3', 'new'];
    const result = myersDiff(a, b);
    const texts = result.map((l) => l.type + ':' + l.text);
    expect(texts).toContain('same:same1');
    expect(texts).toContain('same:same2');
    expect(texts).toContain('same:same3');
  });

  it('keeps a full replacement as removed + added (no spurious same)', () => {
    const result = myersDiff(['old'], ['new']);
    expect(result).toEqual([
      { type: 'removed', text: 'old' },
      { type: 'added', text: 'new' },
    ]);
  });

  it('reconstructs B exactly from the ops', () => {
    const a = ['one', 'two', 'three', 'four', 'five'];
    const b = ['zero', 'two', 'three', 'four', 'five', 'six'];
    const ops = myersDiff(a, b);
    const rebuilt = ops.filter((o) => o.type !== 'removed').map((o) => o.text);
    expect(rebuilt).toEqual(b);
  });
});

describe('diffTexts', () => {
  it('splits on lines and ignores a trailing newline', () => {
    const result = diffTexts('<div>\n</div>\n', '<div>\n  <p>x</p>\n</div>\n');
    const rebuilt = result.filter((o) => o.type !== 'removed').map((o) => o.text).join('\n');
    expect(rebuilt).toBe('<div>\n  <p>x</p>\n</div>');
  });
});
