import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Shell, Page, PageHeaderV2, Stack, Grid, Split, Field, Input, Textarea,
  Select, Tabs, Menu, Dialog, Sheet, EmptyState, ErrorState, Skeleton,
  ListingShell, DetailShell, Wizard,
} from '../src/compositions/canon-v2';
import { COMPONENT_DEFS, getComponentDef } from '../src/componentDefs';

const V2_NAMES = [
  'Shell', 'Page', 'PageHeaderV2', 'Stack', 'Grid', 'Split', 'Field', 'Input',
  'Textarea', 'Select', 'Tabs', 'Menu', 'Dialog', 'Sheet', 'EmptyState',
  'ErrorState', 'Skeleton', 'ListingShell', 'DetailShell', 'Wizard',
];

describe('canon v2 — componentDefs registration', () => {
  it('registers every canon v2 component with an attribute-scoped cssClass', () => {
    for (const name of V2_NAMES) {
      const def = getComponentDef(name);
      expect(def, `${name} missing from COMPONENT_DEFS`).toBeDefined();
      expect(def!.css_class.startsWith('[data-p31'), `${name} cssClass not attribute-scoped: ${def!.css_class}`).toBe(true);
      expect(def!.importPath).toBe('@p31ca/design-core/canon-v2');
    }
  });

  it('leaves the legacy PageHeader contract untouched', () => {
    const legacy = getComponentDef('PageHeader');
    expect(legacy).toBeDefined();
    expect(legacy!.css_class).toBe('page-header-route');
  });
});

describe('canon v2 — layout primitives', () => {
  it('Shell renders skip link, topbar, sidebar, and main regions', () => {
    const html = renderToStaticMarkup(
      <Shell topbar={<div>top</div>} sidebar={<nav>rail</nav>}><p>body</p></Shell>,
    );
    expect(html).toContain('data-p31="shell"');
    expect(html).toContain('data-has-sidebar');
    expect(html).toContain('data-p31="skip-link"');
    expect(html).toContain('href="#p31-main"');
    expect(html).toContain('data-p31="shell-topbar"');
    expect(html).toContain('data-p31="shell-sidebar"');
    expect(html).toContain('data-p31="shell-main"');
  });

  it('Page renders its data-mode and defaults to flow', () => {
    expect(renderToStaticMarkup(<Page><p>x</p></Page>)).toContain('data-mode="flow"');
    expect(renderToStaticMarkup(<Page mode="panel-scroll"><p>x</p></Page>)).toContain('data-mode="panel-scroll"');
    expect(renderToStaticMarkup(<Page mode="fit"><p>x</p></Page>)).toContain('data-mode="fit"');
  });

  it('PageHeaderV2 renders title/subtitle/actions regions', () => {
    const html = renderToStaticMarkup(
      <PageHeaderV2 title="Servers" subtitle="All of them" actions={<button>New</button>} />,
    );
    expect(html).toContain('data-p31="page-header"');
    expect(html).toContain('data-p31="page-header-title"');
    expect(html).toContain('data-p31="page-header-subtitle"');
    expect(html).toContain('data-p31="page-header-actions"');
    expect(html).toContain('Servers');
  });

  it('Stack and Grid render their data-driven variants', () => {
    const stack = renderToStaticMarkup(<Stack dir="row" gap="sm" align="center" justify="between"><span/></Stack>);
    expect(stack).toContain('data-p31="stack"');
    expect(stack).toContain('data-dir="row"');
    expect(stack).toContain('data-gap="sm"');
    expect(stack).toContain('data-align="center"');
    expect(stack).toContain('data-justify="between"');
    const grid = renderToStaticMarkup(<Grid min="lg"><span/></Grid>);
    expect(grid).toContain('data-p31="grid"');
    expect(grid).toContain('data-min="lg"');
  });

  it('Split renders two panes, a separator handle, and collapse hides the handle', () => {
    const html = renderToStaticMarkup(<Split a={<p>a</p>} b={<p>b</p>} defaultRatio={0.35} />);
    expect(html).toContain('data-p31="split"');
    expect(html).toContain('data-side="a"');
    expect(html).toContain('data-side="b"');
    expect(html).toContain('data-p31="split-handle"');
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-valuenow="35"');
    expect(html).toContain('--_split-a:0.35fr');
    const collapsed = renderToStaticMarkup(<Split a={<p>a</p>} b={<p>b</p>} collapsed />);
    expect(collapsed).toContain('data-collapsed');
    expect(collapsed).not.toContain('split-handle');
  });
});

describe('canon v2 — controls', () => {
  it('Input/Textarea/Select carry data-p31-control as the FIRST attribute', () => {
    const input = renderToStaticMarkup(<Input label="Name" error="Required" />);
    expect(input).toMatch(/<(input|select|textarea) data-p31-control/);
    expect(input).toContain('data-p31-control="input"');
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('data-p31="field-label"');

    const textarea = renderToStaticMarkup(<Textarea label="Body" hint="Markdown ok" />);
    expect(textarea).toMatch(/<(input|select|textarea) data-p31-control/);
    expect(textarea).toContain('data-p31-control="textarea"');
    expect(textarea).toContain('data-p31="field-hint"');

    const select = renderToStaticMarkup(<Select label="Region" options={[{ value: 'eu', label: 'Europe' }]} />);
    expect(select).toMatch(/<(input|select|textarea) data-p31-control/);
    expect(select).toContain('data-p31-control="select"');
    expect(select).toContain('<option value="eu">Europe</option>');
  });

  it('Field wires label htmlFor, error role=alert, and hint ids', () => {
    const ok = renderToStaticMarkup(<Field id="x" label="L" hint="h"><input data-p31-control="input" id="x" /></Field>);
    expect(ok).toContain('for="x"');
    expect(ok).toContain('id="x-hint"');
    const bad = renderToStaticMarkup(<Field id="x" label="L" error="no"><input data-p31-control="input" id="x" /></Field>);
    expect(bad).toContain('role="alert"');
    expect(bad).toContain('id="x-error"');
  });

  it('Tabs renders a roving-tabindex tablist', () => {
    const html = renderToStaticMarkup(
      <Tabs items={[{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }]} activeId="b" />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
  });

  it('Menu renders menuitem buttons', () => {
    const html = renderToStaticMarkup(<Menu items={[{ id: 'copy', label: 'Copy' }]} />);
    expect(html).toContain('data-p31="menu"');
    expect(html).toContain('role="menuitem"');
  });

  it('Dialog and Sheet render only when open, with aria-modal', () => {
    expect(renderToStaticMarkup(<Dialog open={false} onClose={() => {}} title="t" />)).toBe('');
    const dialog = renderToStaticMarkup(<Dialog open onClose={() => {}} title="Confirm"><p>body</p></Dialog>);
    expect(dialog).toContain('data-p31="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('data-p31="dialog-panel"');
    const sheet = renderToStaticMarkup(<Sheet open onClose={() => {}} title="Filters" side="start" />);
    expect(sheet).toContain('data-p31="sheet"');
    expect(sheet).toContain('data-side="start"');
  });
});

describe('canon v2 — states and patterns', () => {
  it('EmptyState and ErrorState render title/description/action', () => {
    const empty = renderToStaticMarkup(<EmptyState title="Nothing" description="Try again" />);
    expect(empty).toContain('data-p31="empty-state"');
    expect(empty).toContain('data-p31="state-title"');
    const error = renderToStaticMarkup(<ErrorState title="Failed" />);
    expect(error).toContain('data-p31="error-state"');
    expect(error).toContain('role="alert"');
  });

  it('Skeleton renders bars and honours the block shape', () => {
    const html = renderToStaticMarkup(<Skeleton lines={2} block />);
    expect(html).toContain('data-p31="skeleton"');
    expect(html).toContain('data-p31="skeleton-bar"');
    expect(html).toContain('data-shape="bar"');
    expect(html).toContain('data-shape="block"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('ListingShell renders controls + grid, and the empty state when empty', () => {
    const filled = renderToStaticMarkup(
      <ListingShell controls={<div>filters</div>}><div>card</div></ListingShell>,
    );
    expect(filled).toContain('data-p31="listing-shell"');
    expect(filled).toContain('data-p31="listing-controls"');
    expect(filled).toContain('data-p31="listing-grid"');
    const empty = renderToStaticMarkup(<ListingShell>{[]}</ListingShell>);
    expect(empty).toContain('data-p31="empty-state"');
    expect(empty).not.toContain('listing-grid');
  });

  it('DetailShell renders summary/focus/actions regions', () => {
    const html = renderToStaticMarkup(
      <DetailShell summary={<p>s</p>} focus={<p>f</p>} actions={<button>a</button>} />,
    );
    expect(html).toContain('data-p31="detail-shell"');
    expect(html).toContain('data-p31="detail-summary"');
    expect(html).toContain('data-p31="detail-focus"');
    expect(html).toContain('data-p31="detail-actions"');
  });

  it('Wizard renders Step N of M, the step group, and back/next buttons', () => {
    const steps = [{ id: 'one', title: 'Name' }, { id: 'two', title: 'Region' }];
    const first = renderToStaticMarkup(
      <Wizard steps={steps} activeIndex={0} onBack={() => {}} onNext={() => {}} onFinish={() => {}}><p>q</p></Wizard>,
    );
    expect(first).toContain('Step 1 of 2');
    expect(first).toContain('data-p31="wizard-indicator"');
    expect(first).toContain('data-p31="wizard-step"');
    expect(first).toContain('>Back</button>');
    expect(first).toContain('>Next</button>');
    const last = renderToStaticMarkup(
      <Wizard steps={steps} activeIndex={1} onBack={() => {}} onNext={() => {}} onFinish={() => {}}><p>q</p></Wizard>,
    );
    expect(last).toContain('>Finish</button>');
    expect(last).not.toContain('>Next</button>');
  });
});

describe('canon v2 — barrel surface', () => {
  it('COMPONENT_DEFS contains no duplicate keys across the family', () => {
    expect(new Set(V2_NAMES).size).toBe(V2_NAMES.length);
    const all = Object.keys(COMPONENT_DEFS);
    expect(new Set(all).size).toBe(all.length);
  });
});