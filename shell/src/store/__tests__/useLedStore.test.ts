import { describe, it, expect, beforeEach } from 'vitest';
import { useLedStore, LED_MODES, LED_PALETTE_SLOTS } from '../useLedStore';

beforeEach(() => {
  useLedStore.setState({
    mode: 'rainbow',
    speed: 5,
    brightness: 80,
    color: '#22d3ee',
    colors: ['#ff9944', '#22d3ee', '#44ffaa'],
  });
});

describe('useLedStore — NeoPixel controller state', () => {
  it('defaults match spaceship-earth domeConfig.led', () => {
    const s = useLedStore.getState();
    expect(s.mode).toBe('rainbow');
    expect(s.speed).toBe(5);
    expect(s.brightness).toBe(80);
    expect(s.color).toBe('#22d3ee');
    expect(s.colors).toEqual(['#ff9944', '#22d3ee', '#44ffaa']);
  });

  it('exposes the seven documented modes', () => {
    expect(LED_MODES).toEqual(['rainbow', 'chase', 'solid', 'breath', 'gradient', 'dual-chase', 'off']);
  });

  it('only gradient and dual-chase consume palette slots', () => {
    expect(LED_PALETTE_SLOTS.rainbow).toBe(0);
    expect(LED_PALETTE_SLOTS.solid).toBe(0);
    expect(LED_PALETTE_SLOTS.gradient).toBe(2);
    expect(LED_PALETTE_SLOTS['dual-chase']).toBe(2);
    expect(LED_PALETTE_SLOTS.off).toBe(0);
  });

  it('persists mode, color, speed and brightness setters', () => {
    const s = useLedStore.getState();
    s.setMode('chase');
    s.setColor('#c97b52');
    s.setSpeed(9);
    s.setBrightness(25);

    const next = useLedStore.getState();
    expect(next.mode).toBe('chase');
    expect(next.color).toBe('#c97b52');
    expect(next.speed).toBe(9);
    expect(next.brightness).toBe(25);
  });

  it('clamps speed to 0-10 and brightness to 0-100', () => {
    const s = useLedStore.getState();
    s.setSpeed(99);
    s.setBrightness(-5);
    expect(useLedStore.getState().speed).toBe(10);
    expect(useLedStore.getState().brightness).toBe(0);
  });

  it('resetLed restores defaults', () => {
    useLedStore.getState().setMode('off');
    useLedStore.getState().resetLed();
    const next = useLedStore.getState();
    expect(next.mode).toBe('rainbow');
    expect(next.speed).toBe(5);
    expect(next.brightness).toBe(80);
    expect(next.color).toBe('#22d3ee');
  });
});
