import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './Toast';
import { Button } from './Button';

function Demo() {
  const { toast } = useToast();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button onClick={() => toast('Care entry saved', { tone: 'success' })}>Success</Button>
      <Button variant="danger" onClick={() => toast('Sync failed — retry?', { tone: 'error', duration: 0 })}>Error sticky</Button>
      <Button variant="ghost" onClick={() => toast('Heads up', { tone: 'warning' })}>Warning</Button>
    </div>
  );
}

const meta: Meta = { title: 'Primitives/Toast', tags: ['autodocs'] };
export default meta;
export const Tones: StoryObj = { render: () => <ToastProvider><Demo /></ToastProvider> };
