import { describe, it, expect } from 'vitest';
import { handleValidateOutput, handleScaffoldComponent, handleProposePage } from './handlers/governance';

// Negative controls: every governance tool must refuse out-of-contract input.
// A planted violation must be caught (valid=false / status=error), never guessed at.

describe('validate_output — fail-closed (negative controls)', () => {
  it('flags hardcoded hex', async () => {
    const r = await handleValidateOutput({ code: 'const c = "#ffffff";' });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v: string) => v.startsWith('hardcoded_hex'))).toBe(true);
  });

  it('flags raw rgba() color', async () => {
    const r = await handleValidateOutput({ code: 'const c = "rgba(255,255,255,0.5)";' });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v: string) => v.startsWith('raw_color'))).toBe(true);
  });

  it('flags inline style', async () => {
    const r = await handleValidateOutput({ code: '<div style={{ padding: 4 }}>' });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v: string) => v.startsWith('inline_style'))).toBe(true);
  });

  it('flags emoji as icon', async () => {
    const r = await handleValidateOutput({ code: 'const icon = "🛰️";' });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v: string) => v.startsWith('emoji_icon'))).toBe(true);
  });

  it('flags legacy token vocabulary', async () => {
    const r = await handleValidateOutput({ code: 'const c = "semantic.text";' });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v: string) => v.startsWith('legacy_token_vocabulary'))).toBe(true);
  });

  it('flags a contract forbidden pattern for a known component', async () => {
    const r = await handleValidateOutput({ code: '// hardcoded hex', component: 'Button' });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v: string) => v.startsWith('forbidden_pattern'))).toBe(true);
  });

  it('passes clean token-based output', async () => {
    const r = await handleValidateOutput({ code: 'const c = "var(--p31-accent)";' });
    expect(r.valid).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it('refuses an unknown component name', async () => {
    const r = await handleValidateOutput({ code: 'const x = 1;', component: 'Nope' });
    expect(r.status).toBe('error');
  });
});

describe('scaffold_component — fail closed', () => {
  it('refuses an unknown component', async () => {
    const r = await handleScaffoldComponent({ name: 'Nope' });
    expect(r.status).toBe('error');
  });

  it('scaffolds a known component with its css_class and contract', async () => {
    const r = await handleScaffoldComponent({ name: 'Button' });
    expect(r.status).toBe('ok');
    expect(r.name).toBe('Button');
    expect(r.css_class).toBe('btn');
    expect(r.scaffold.tsx).toContain('className="btn"');
    expect(r.contract.props.length).toBeGreaterThan(0);
  });
});

describe('propose_page — fail closed', () => {
  it('refuses an invalid layout type', async () => {
    const r = await handleProposePage({ type: 'carousel', components: ['GlassCard'] });
    expect(r.status).toBe('error');
  });

  it('refuses a proposal with an unknown component', async () => {
    const r = await handleProposePage({ type: 'card-grid', components: ['GlassCard', 'Nope'] });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('unknown_component: Nope');
  });

  it('proposes a valid page from canon components', async () => {
    const r = await handleProposePage({ title: 'Care Home', type: 'card-grid', components: ['GlassCard', 'Button'] });
    expect(r.valid).toBe(true);
    expect(r.page.sections.length).toBe(2);
  });
});