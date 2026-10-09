/**
 * @file index.test.tsx — @p31ca/governance facade smoke test.
 * Verifies the re-exports from @p31ca/design-core/governance resolve through the
 * facade package (the implementation is tested in design-core).
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ChainTimeline,
  VerifyButton,
  EnforcementGauge,
  RefusalFeed,
  ProposalQueue,
  SovereignBadge,
  LumiIdentityCard,
} from './index';
import { GOVERNANCE, DENSITY, densityForSpoons } from '@p31ca/design-core/tokens';

describe('@p31ca/governance facade', () => {
  it('re-exports all 7 components', () => {
    expect(typeof ChainTimeline).toBe('function');
    expect(typeof VerifyButton).toBe('function');
    expect(typeof EnforcementGauge).toBe('function');
    expect(typeof RefusalFeed).toBe('function');
    expect(typeof ProposalQueue).toBe('function');
    expect(typeof SovereignBadge).toBe('function');
    expect(typeof LumiIdentityCard).toBe('function');
  });

  it('ChainTimeline renders through the facade', () => {
    const html = renderToStaticMarkup(
      <ChainTimeline
        verifyStatus="intact"
        events={[{ seq: 1, ts: 't', actor: 'agent', action: 'propose', hash: '0x1' }]}
      />,
    );
    expect(html).toContain('Chain intact');
  });

  it('exposes governance tokens', () => {
    expect(GOVERNANCE.chainVerified).toBe('#34D399');
    expect(DENSITY.comfortable.factor).toBe(1);
    expect(densityForSpoons(1)).toBe('compact');
  });
});