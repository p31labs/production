import { describe, it, expect } from 'vitest';
import B from '../../brand.js';
import forge from '../../forge.js';
import { Packer } from 'docx';

describe('p31-forge brand token contract', () => {
  it('exposes the two-mode THEMES (scene + hub) aligned to the P31 system', () => {
    expect(B.THEMES).toBeDefined();
    expect(B.THEMES.scene).toBeDefined();
    expect(B.THEMES.hub).toBeDefined();
    // Hub is the warm editorial front door: terracotta accent, cream bg.
    expect(B.THEMES.hub.accent).toBe('D97757');
    expect(B.THEMES.hub.bg).toBe('FAF9F5');
    // Scene is the dark immersive mode: cyan signal.
    expect(B.THEMES.scene.accent).toBe('2BB3D9');
    expect(B.THEMES.scene.bg).toBe('0D0D12');
  });

  it('carries the verified/source evidence colors', () => {
    expect(B.THEMES.hub.verified).toBe('6B8A5E'); // sage
    expect(B.THEMES.hub.broken).toBe('B34A3A');  // crimson
    expect(B.THEMES.scene.verified).toBe('4CAF8D');
  });

  it('uses Lora as the display serif (not Georgia) for hub documents', () => {
    expect(B.TYPE.serif).toBe('Lora');
    expect(B.TYPE.legalSerif).toBe('Georgia'); // retained for court filings
    expect(B.TYPE.sans).toBe('Plus Jakarta Sans');
  });

  it('keeps the calcium-cage ENTITY constants intact (EIN, org, case)', () => {
    expect(B.ENTITY.ein).toBe('42-1888158');
    expect(B.ENTITY.org).toBe('P31 Labs, Inc.');
    expect(B.ENTITY.caseNo).toBe('2025CV936');
  });
});

describe('p31-forge evidence-block primitive', () => {
  it('compiles a hub-theme grant pack containing an evidence block', async () => {
    const pack = {
      kind: 'grant',
      theme: 'hub',
      title: 'Test Grant',
      filename: 'test-grant.docx',
      amount: '$10,000',
      body: [
        { type: 'para', text: 'Opening paragraph.' },
        {
          type: 'evidence',
          claim: 'Agent observability & governance market',
          value: '$1.68B (2026) \u2192 $8.62B (2031), 38.69% CAGR',
          source: 'Mordor Intelligence \u2014 mordorintelligence.com/industry-reports/agent-observability-and-governance-market',
          verified: '2026-09-23',
        },
      ],
    };
    const doc = forge.compile(pack);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('compiles a scene-theme resolution with an evidence block', async () => {
    const pack = {
      kind: 'resolution',
      theme: 'scene',
      title: 'TEST RESOLUTION',
      date: 'September 23, 2026',
      body: [
        { type: 'h1', text: 'WHEREAS' },
        { type: 'para', text: 'The organization maintains a verifiable audit trail.' },
        { type: 'evidence', claim: 'Live chain valid', value: 'checked 16', source: 'loom.p31ca.org/api/loom-public/verify', verified: '2026-09-23' },
      ],
    };
    const doc = forge.compile(pack);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('defaults unknown/absent theme to hub', async () => {
    const pack = { kind: 'memo', title: 'T', date: '2026-09-23', body: [] };
    const doc = forge.compile(pack);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(500);
  });
});

describe('p31-forge renderer dispatch', () => {
  it('supports all six content-pack kinds', () => {
    for (const kind of ['paper', 'court', 'letter', 'resolution', 'memo', 'grant']) {
      const doc = forge.compile({ kind, title: 'X', date: '2026-09-23', body: [] });
      expect(doc).toBeDefined();
    }
  });

  it('rejects an unknown kind', () => {
    expect(() => forge.compile({ kind: 'nope', body: [] })).toThrow(/Unknown content-pack kind/);
  });
});