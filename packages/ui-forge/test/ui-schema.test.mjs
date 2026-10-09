import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { schema, catalog } = JSON.parse(readFileSync(resolve(here, '../ui-schema.json'), 'utf8'));

// Minimal validator: component type must be in the closed enum, props must
// not add undeclared keys, token refs must be p31.*-namespaced. (A full Ajv
// pass would be heavier; this exercises the THAKI gate contract directly.)
function validate(node, known = new Set(schema.properties.type.enum)) {
  const errors = [];
  if (!node || typeof node !== 'object') return ['node must be an object'];
  if (!known.has(node.type)) errors.push(`type "${node.type}" not in closed enum`);
  const propDef = schema.$defs?.[`p31Props.${node.type}`];
  if (propDef && node.props) {
    for (const k of Object.keys(node.props)) {
      if (!(k in (propDef.properties ?? {}))) errors.push(`"${node.type}".props.${k} is not a declared prop`);
    }
  }
  if (node.tokens) {
    for (const t of node.tokens) {
      if (!/^p31([.][a-z][a-z0-9-]*)+$/.test(t)) errors.push(`token "${t}" not p31.*-namespaced`);
    }
  }
  for (const child of node.children ?? []) errors.push(...validate(child, known));
  return errors;
}

test('schema has a closed component enum', () => {
  assert.ok(schema.properties.type.enum.length >= 30, 'should include the 34 registered components');
  assert.equal(schema.$defs.p31Component.properties.type.enum.length, schema.properties.type.enum.length);
});

test('every catalog component has a $def and closed props', () => {
  for (const c of catalog.components) {
    assert.ok(schema.$defs[`p31Props.${c.name}`], `${c.name} missing props $def`);
  }
});

test('Button closed enums are present', () => {
  const btn = catalog.components.find((c) => c.name === 'Button' && c.category === 'contract');
  assert.ok(btn, 'contract Button exists');
  const variant = btn.props.find((p) => p.name === 'variant');
  assert.deepEqual(variant.enum, ['primary', 'secondary', 'ghost']);
  const size = btn.props.find((p) => p.name === 'size');
  assert.deepEqual(size.enum, ['sm', 'md', 'lg']);
});

test('a valid tree passes the gate contract', () => {
  const tree = {
    type: 'Button',
    props: { variant: 'primary', children: 'Save' },
    tokens: ['p31.color.action.primary'],
    id: 'btn-1',
  };
  assert.deepEqual(validate(tree), []);
});

test('a bad type, undeclared prop, and non-p31 token are rejected', () => {
  const bad = {
    type: 'DefinitelyNotAComponent',
    props: { bogusProp: 1 },
    tokens: ['p31.color.action.primary', 'color.red'],
    children: [{ type: 'Button', props: { madeUp: true } }],
  };
  const errs = validate(bad);
  assert.ok(errs.some((e) => e.includes('not in closed enum')));
  assert.ok(errs.some((e) => e.includes('madeUp')), 'undeclared prop caught');
  assert.ok(errs.some((e) => e.includes('color.red')), 'non-p31 token caught');
});