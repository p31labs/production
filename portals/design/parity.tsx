/**
 * parity.tsx — the component-mount harness for the runtime parity gate.
 *
 * Serves ONE design-core component per load, rendered into #root with props
 * read from the URL (`?component=Name&props=<json>`). This is the browser half
 * of tests/parity/parity.spec.ts: the spec owns the contract + assertions; this
 * file owns only "mount the named component with the given props".
 *
 * Dev-only (served by `vite --port 5195`); never part of the shipped app.
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import '@p31ca/design-core/css/index.css';

const rootEl = document.getElementById('root')!;

function fail(msg: string) {
  rootEl.textContent = `[parity harness] ${msg}`;
}

async function boot() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('component');
  if (!name) return fail('missing ?component=');

  let props: Record<string, unknown> = {};
  try {
    props = JSON.parse(params.get('props') ?? '{}');
  } catch {
    return fail('invalid ?props= JSON');
  }

  let Comp: unknown;
  try {
    const mod = await import('@p31ca/design-core/compositions');
    Comp = (mod as Record<string, unknown>)[name];
  } catch (err) {
    return fail(`import failed: ${String(err)}`);
  }
  if (!Comp) return fail(`unknown component: ${name}`);

  createRoot(rootEl).render(createElement(Comp as (p: unknown) => JSX.Element, props));
}

boot();