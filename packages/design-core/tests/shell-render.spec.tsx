import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShellFrame, BlockList, type BlockRegistry } from '../src/shell/render';
import { PortalShell } from '../src/shell/PortalShell';
import { MetricRowBlock } from '../src/compositions/MetricRowBlock';

describe('ShellFrame — the shell renderer (config → App tree)', () => {
  const registry: BlockRegistry = { 'metric-row-block': MetricRowBlock };

  it('renders the named slots', () => {
    const html = renderToStaticMarkup(
      <ShellFrame
        header={<header>topbar</header>}
        main={[]}
        registry={registry}
      />,
    );
    expect(html).toContain('p31-shell');
    expect(html).toContain('p31-shell__main');
    expect(html).toContain('topbar');
  });

  it('mounts blocks in order from placements with their configured props', () => {
    const html = renderToStaticMarkup(
      <ShellFrame
        main={[{ blockId: 'metric-row-block', slot: 'main', order: 0, props: { items: [{ value: '48', label: 'packs' }] } }]}
        registry={registry}
      />,
    );
    expect(html).toContain('metric__value');
    expect(html).toContain('48');
    expect(html).toContain('packs');
  });

  it('renders a missing block as a visible no-op, not a crash', () => {
    const html = renderToStaticMarkup(<BlockList slot={[{ blockId: 'nope', slot: 'main', order: 0 }]} registry={registry} />);
    expect(html).toContain('data-missing-block');
  });
});

describe('PortalShell — the canonical chameleon frame', () => {
  it('renders skip-link, header, app-shell, main, and config blocks; slots stay host-supplied', () => {
    const html = renderToStaticMarkup(
      <PortalShell
        config={{ shell: { header: { topbar: 'canon' }, main: [{ blockId: 'metric-row-block', slot: 'main', order: 0, props: { items: [{ value: '48', label: 'packs' }] } }] } }}
        registry={{ 'metric-row-block': MetricRowBlock }}
        header={<header className="topbar">topbar-fill</header>}
        sidebar={<aside>nav-fill</aside>}
      >
        <div>route-content</div>
      </PortalShell>,
    );
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('topbar-fill');
    expect(html).toContain('nav-fill');
    expect(html).toContain('main-workspace');
    expect(html).toContain('metric__value');
    expect(html).toContain('route-content');
  });
});
