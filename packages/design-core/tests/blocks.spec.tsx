import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EvidenceBlock } from '../src/compositions/EvidenceBlock';
import { MetricRowBlock } from '../src/compositions/MetricRowBlock';
import { GovernanceOverviewBlock } from '../src/compositions/GovernanceOverviewBlock';
import { placementValid, SHELL_SLOT_CATEGORY } from '../src/shell/contract';

const EVIDENCE: Parameters<typeof EvidenceBlock>[0] = {
  claim: 'The chain is tamper-evident',
  value: 'SHA-256 / RFC 8785',
  source: 'canon/src/loom/hash-chain.ts',
  verified: '2026-10-01',
};

describe('EvidenceBlock — the first registry:block', () => {
  it('renders claim / value / source / verified', () => {
    const html = renderToStaticMarkup(<EvidenceBlock {...EVIDENCE} />);
    expect(html).toContain('evidence-block__claim');
    expect(html).toContain('The chain is tamper-evident');
    expect(html).toContain('SHA-256 / RFC 8785');
    expect(html).toContain('Source: canon/src/loom/hash-chain.ts');
    expect(html).toContain('Verified: 2026-10-01');
  });
});

describe('shell contract — placement validity', () => {
  it('main accepts page blocks; header accepts none; ambient accepts ambient', () => {
    expect(SHELL_SLOT_CATEGORY.main).toBe('page');
    expect(SHELL_SLOT_CATEGORY.header).toBeNull();
    expect(SHELL_SLOT_CATEGORY.ambient).toBe('ambient');
  });

  it('a page block is valid in main, invalid in header', () => {
    const block = { id: 'evidence-block', name: 'EvidenceBlock', type: 'registry:block' as const, category: 'page' as const, description: '', status: 'stable' as const, props: {}, importPath: '', confidence: 'supervised' as const };
    expect(placementValid(block, { blockId: 'evidence-block', slot: 'main', order: 0 })).toBe(true);
    expect(placementValid(block, { blockId: 'evidence-block', slot: 'header', order: 0 })).toBe(false);
    expect(placementValid(block, { blockId: 'evidence-block', slot: 'ambient', order: 0 })).toBe(false);
  });
});
describe('MetricRowBlock — the simplest block', () => {
  it('renders ordered value+label metrics', () => {
    const html = renderToStaticMarkup(<MetricRowBlock items={[{ value: '48', label: 'packs' }, { value: '6', label: 'domains' }]} />);
    expect(html).toContain('metric__value');
    expect(html).toContain('48');
    expect(html).toContain('packs');
    expect((html.match(/metric__value/g) ?? []).length).toBe(2);
  });
});

describe('GovernanceOverviewBlock — the composed block', () => {
  it('renders evidence items via the canon EvidenceBlock (block nesting)', () => {
    const html = renderToStaticMarkup(
      <GovernanceOverviewBlock
        title="Sovereign Stack Governance"
        body={[{ type: 'evidence', claim: 'C', value: 'V', source: 'S', verified: '2026' }, { type: 'para', text: 'a paragraph' }]}
      />,
    );
    expect(html).toContain('governance-overview__title');
    expect(html).toContain('Sovereign Stack Governance');
    expect(html).toContain('evidence-block__claim');
    expect(html).toContain('a paragraph');
  });
});
