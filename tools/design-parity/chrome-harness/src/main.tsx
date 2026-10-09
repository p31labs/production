/**
 * Isolated chrome render harness.
 *
 * Dedicated page per component (react-screenshot-test pattern): the URL
 * ?component=SidebarNav mounts ONLY that component, standalone — no card
 * chrome, no description text, no text-wrap noise. This is the capture target
 * for the parity_chrome baselines at component granularity.
 *
 * Import order mirrors a canon consumer: index.css bundles tokens + recipes
 * (which define the .topbar base) + chrome (the unified slot model).
 */
import '@p31ca/design-core/css/index.css';
import './harness.css';
import { createRoot } from 'react-dom/client';
import { renderChrome } from './render';

const params = new URLSearchParams(window.location.search);
const component = params.get('component') ?? 'SidebarNav';
const root = document.getElementById('root');
if (root) createRoot(root).render(renderChrome(component));