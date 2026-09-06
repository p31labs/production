/**
 * axe-core accessibility smoke over the canonical primitive set.
 * Runs in jsdom; asserts zero critical violations.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { Button } from '../src/primitives/Button';
import { Input } from '../src/primitives/Input';
import { Select } from '../src/primitives/Select';
import { Checkbox } from '../src/primitives/Checkbox';
import { RadioGroup } from '../src/primitives/Radio';
import { Badge } from '../src/primitives/Badge';
import { Spinner } from '../src/primitives/Spinner';

describe.sequential('axe-core (jsdom)', () => {
  it('canonical primitive page has no critical violations', async () => {
    const { container, unmount } = render(
      <main>
        <h1>A11y probe</h1>
        <Button>Save</Button>
        <Button variant="danger" size="lg">Delete</Button>
        <Input label="Name" hint="Your display name" />
        <Select label="Tier" options={[{ value: '1', label: 'One' }]} />
        <Checkbox label="Subscribe" />
        <RadioGroup
          value="a"
          onChange={() => {}}
          ariaLabel="choice"
          options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
        />
        <Badge tone="success">online</Badge>
        <Spinner size="sm" />
      </main>
    );
    document.body.appendChild(container);

    const results = await new Promise<axe.AxeResults>((resolve) => {
      axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag21a'] } }, (_err, res) =>
        resolve(res as axe.AxeResults)
      );
    });

    unmount();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical.map((v) => [v.id, v.nodes.length])).toEqual([]);
  });
});
