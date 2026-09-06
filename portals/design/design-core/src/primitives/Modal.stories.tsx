import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';

function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm action"
        actions={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Confirm</Button></>}>
        This dialog is fully opaque in crisis mode.
      </Modal>
    </>
  );
}

const meta: Meta = { title: 'Primitives/Modal', tags: ['autodocs'] };
export default meta;
export const Interactive: StoryObj = { render: () => <Demo /> };
