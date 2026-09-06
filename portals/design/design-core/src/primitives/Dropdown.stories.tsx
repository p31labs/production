import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from './Dropdown';
import { Button } from './Button';

const meta: Meta = { title: 'Primitives/Dropdown', tags: ['autodocs'] };
export default meta;
export const Menu: StoryObj = {
  render: () => (
    <Dropdown
      ariaLabel="Actions"
      trigger={({ open }) => <Button variant="secondary">{open ? '▲' : '▼'} Actions</Button>}
      items={[{ value: 'edit', label: 'Edit' }, { value: 'share', label: 'Share' }, { value: 'del', label: 'Delete', disabled: true }]}
      onSelect={(v) => console.log(v)}
    />
  ),
};
