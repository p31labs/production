import { describe, it, expect } from 'vitest';
import {
  validateMapping,
  applyMappingSet,
  applyMappingClear,
  groupByKind,
  MAX_DESTINATIONS,
  type Mapping,
} from './router';
import { isKnownDestination, destinationLabel, POLYSYNTH_DESTINATIONS, DRUMKIT_DESTINATIONS } from './controlRegistry';

const m = (source: string, destination: string): Mapping => ({
  source,
  destination,
  mapping: {},
});

describe('router — validateMapping', () => {
  it('accepts a valid source→destination pair', () => {
    expect(validateMapping(
      { source: 'ui:control-cutoff', destination: 'synth:param-cutoff' },
      [],
    ).ok).toBe(true);
  });

  it('refuses an unknown destination with a structured code', () => {
    const r = validateMapping(
      { source: 'ui:control-x', destination: 'synth:param-notreal' },
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_DESTINATION');
    expect(r.message).toContain('not a known destination');
  });

  it('refuses a malformed source', () => {
    const r = validateMapping({ source: 'garbage', destination: 'synth:param-cutoff' }, []);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_SOURCE');
  });

  it('refuses a destination already bound to a different source', () => {
    const r = validateMapping(
      { source: 'midi:in-1', destination: 'synth:param-cutoff' },
      [m('ui:control-cutoff', 'synth:param-cutoff')],
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('DESTINATION_TAKEN');
  });

  it('refuses a source already bound to a different destination', () => {
    const r = validateMapping(
      { source: 'ui:control-cutoff', destination: 'synth:param-resonance' },
      [m('ui:control-cutoff', 'synth:param-cutoff')],
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SOURCE_TAKEN');
  });

  it('refuses past the destination cap', () => {
    const full: Mapping[] = Array.from({ length: MAX_DESTINATIONS }, (_, i) =>
      m(`ui:control-${i}`, `midi:out-${i % 16}`),
    );
    const r = validateMapping({ source: 'ui:control-new', destination: 'wled:seg-0' }, full);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('DESTINATION_CAP');
  });
});

describe('router — applyMappingSet / applyMappingClear', () => {
  it('set replaces both the destination and the source binding', () => {
    const before = [m('ui:control-a', 'synth:param-cutoff')];
    const after = applyMappingSet(before, m('ui:control-b', 'synth:param-cutoff'));
    expect(after).toEqual([m('ui:control-b', 'synth:param-cutoff')]);
  });

  it('set clears the source\'s previous destination', () => {
    const before = [m('ui:control-a', 'synth:param-cutoff')];
    const after = applyMappingSet(before, m('ui:control-a', 'synth:param-resonance'));
    expect(after).toEqual([m('ui:control-a', 'synth:param-resonance')]);
  });

  it('clear only unbinds the exact pair', () => {
    const before = [m('ui:control-a', 'synth:param-cutoff')];
    const after = applyMappingClear(before, {
      source: 'ui:control-a',
      destination: 'synth:param-resonance', // mismatched
    });
    expect(after).toEqual(before);
    const exact = applyMappingClear(before, {
      source: 'ui:control-a',
      destination: 'synth:param-cutoff',
    });
    expect(exact).toEqual([]);
  });
});

describe('router — groupByKind', () => {
  it('groups mappings into the four destination kinds', () => {
    const groups = groupByKind([
      m('ui:control-a', 'synth:param-cutoff'),
      m('ui:control-b', 'midi:out-0'),
      m('ui:control-c', 'wled:seg-0'),
    ]);
    expect(groups.synth).toHaveLength(1);
    expect(groups.midi).toHaveLength(1);
    expect(groups.wled).toHaveLength(1);
    expect(groups.osc).toHaveLength(0);
  });
});

describe('controlRegistry — the destination surface', () => {
  it('derives synth destinations from the voices own param lists', () => {
    expect(POLYSYNTH_DESTINATIONS).toContain('synth:param-cutoff');
    expect(POLYSYNTH_DESTINATIONS).toContain('synth:param-oscMix');
    expect(DRUMKIT_DESTINATIONS).toContain('synth:param-kick.tune');
    expect(DRUMKIT_DESTINATIONS).toContain('synth:param-crash.level');
  });

  it('every derived destination is known', () => {
    for (const d of POLYSYNTH_DESTINATIONS) expect(isKnownDestination(d)).toBe(true);
    for (const d of DRUMKIT_DESTINATIONS) expect(isKnownDestination(d)).toBe(true);
  });

  it('labels destinations for the matrix', () => {
    expect(destinationLabel('synth:param-filterEnvAmount')).toBe('filterEnvAmount');
    expect(destinationLabel('synth:param-kick.tune')).toBe('kick · tune');
    expect(destinationLabel('midi:out-3')).toBe('MIDI ch 3');
    expect(destinationLabel('wled:seg-0')).toBe('WLED seg 0');
  });
});