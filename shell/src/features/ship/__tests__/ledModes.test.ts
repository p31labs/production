import { describe, it, expect } from 'vitest';
import { LED_MODE_MAP, ledUniformsFor, type LedSource } from '@p31ca/shell-chrome';

const LED: LedSource = {
  mode: 'rainbow',
  speed: 5,
  color: '#22d3ee',
  brightness: 80,
  colors: ['#ff9944', '#22d3ee', '#44ffaa'],
};

describe('ledModes — spaceship-earth NeoPixelFrame parity', () => {
  it('maps all seven modes to shader indices', () => {
    expect(LED_MODE_MAP).toEqual({
      rainbow: 0,
      chase: 1,
      solid: 2,
      breath: 3,
      gradient: 4,
      'dual-chase': 5,
      off: 6,
    });
  });

  it('scales speed to 0-1 and brightness to 0-1', () => {
    const u = ledUniformsFor(LED, false);
    expect(u.speed).toBe(0.5);
    expect(u.brightness).toBe(0.8);
  });

  it('maps palette colors and frozen flag', () => {
    const u = ledUniformsFor({ ...LED, mode: 'gradient' }, true);
    expect(u.mode).toBe(4);
    expect(u.color1).toBe('#ff9944');
    expect(u.color2).toBe('#22d3ee');
    expect(u.frozen).toBe(1);
  });

  it('falls back to primary color when palette slots are missing', () => {
    const u = ledUniformsFor({ ...LED, colors: [] }, false);
    expect(u.color1).toBe('#ff9944');
    expect(u.color2).toBe('#22d3ee');
  });
});
