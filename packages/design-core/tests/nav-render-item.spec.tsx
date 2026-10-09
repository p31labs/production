import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SidebarNav } from '../src/compositions/SidebarNav';
import { MobileBottomNav } from '../src/compositions/MobileBottomNav';

const ITEMS = [
  { path: '/', label: 'Home', emoji: '🏠', flagship: true },
  { path: '/catalog', label: 'Catalog', emoji: '🧩', flagship: true },
  { path: '/compose', label: 'Compose', emoji: '⚛️', flagship: true },
  { path: '/identity', label: 'Identity', emoji: '🔐', flagship: true },
  { path: '/activity', label: 'Activity', emoji: '📈' },
];

describe('SidebarNav renderItem', () => {
  it('default renders <button> items (canon behavior preserved)', () => {
    const html = renderToStaticMarkup(<SidebarNav items={ITEMS} activePath="/" />);
    expect(html).toContain('<button');
    expect(html).toContain('sidebar-nav__item');
    expect(html).toContain('aria-current="page"');
  });

  it('renderItem renders the consumer node wrapped with data-active on the active item', () => {
    const html = renderToStaticMarkup(
      <SidebarNav
        items={ITEMS}
        activePath="/compose"
        renderItem={(item, { active }) => <a href={item.path} data-link-active={active || undefined}>{item.label}</a>}
      />,
    );
    expect(html).toContain('<a href="/compose" data-link-active="true">Compose</a>');
    expect(html).not.toContain('<button');
    // Active container carries data-active; non-active items do not.
    expect(html.match(/data-active="true"/g)?.length).toBe(1);
  });
});

describe('MobileBottomNav renderItem', () => {
  it('only flagship items are rendered, as <button> by default', () => {
    const html = renderToStaticMarkup(<MobileBottomNav items={ITEMS} activePath="/" />);
    expect(html).toContain('🏠');
    expect(html).not.toContain('Activity');
    expect(html).toContain('mobile-bottom-nav__btn');
  });

  it('renderItem renders real anchors for the flagship set', () => {
    const html = renderToStaticMarkup(
      <MobileBottomNav
        items={ITEMS}
        activePath="/identity"
        renderItem={(item, { active }) => <a href={item.path} aria-current={active ? 'page' : undefined}>🔗</a>}
      />,
    );
    expect(html).toContain('<a href="/identity" aria-current="page">🔗</a>');
    expect(html).toContain('<a href="/"');
    expect(html).not.toContain('Activity');
    expect(html).not.toContain('<button');
  });
});