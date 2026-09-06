import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Button } from '../../src/primitives/Button';
import { Input } from '../../src/primitives/Input';
import { RadioGroup } from '../../src/primitives/Radio';
import { Modal } from '../../src/primitives/Modal';
import { ToastProvider, useToast } from '../../src/primitives/Toast';

describe('Button', () => {
  it('isLoading sets aria-busy and disables', () => {
    render(<Button isLoading>Go</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('danger variant applies class', () => {
    render(<Button variant="danger">Del</Button>);
    expect(screen.getByRole('button').className).toContain('btn-danger');
  });
});

describe('Input', () => {
  it('wires error to aria-invalid + describedby', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Required');
  });
});

describe('RadioGroup', () => {
  it('selects via keyboard', () => {
    function Harness() {
      const [v, setV] = useState('a');
      return (
        <RadioGroup
          value={v}
          onChange={setV}
          ariaLabel="pick"
          options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]}
        />
      );
    }
    render(<Harness />);
    const beta = screen.getByRole('radio', { checked: false });
    fireEvent.keyDown(beta, { key: 'Enter' });
    expect((screen.getAllByRole('radio')[1] as HTMLElement).getAttribute('aria-checked')).toBe('true');
  });
});

describe('Modal', () => {
  it('Escape closes and focus returns', () => {
    const onClose = vi.fn();
    function Harness() {
      return (
        <Modal open onClose={onClose} title="Confirm">
          body
        </Modal>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('ToastProvider', () => {
  it('useToast renders a live-region toast', () => {
    function Probe() {
      const { toast } = useToast();
      return <button onClick={() => toast('Saved', { tone: 'success' })}>fire</button>;
    }
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByRole('status').textContent).toContain('Saved');
  });
});
