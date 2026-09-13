import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyEvent } from '../lib/chat';
import type { ChatMessage } from '../types';
import App from '../App';

describe('chat portal smoke', () => {
  it('renders the sandbox shell', () => {
    render(<App />);
    expect(screen.getByText('Sandbox')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe the UI you want to build...')).toBeTruthy();
    expect(screen.getByText('What are we building today?')).toBeTruthy();
  });

  it('appends and streams assistant messages through applyEvent', () => {
    let messages: ChatMessage[] = [];
    messages = applyEvent(messages, { type: 'message', message: { id: 'u1', roomId: 'r', role: 'user', content: 'hi', createdAt: 1 }, echo: true });
    messages = applyEvent(messages, { type: 'stream.start', id: 'a1' });
    messages = applyEvent(messages, { type: 'stream.delta', id: 'a1', delta: 'Hel' });
    messages = applyEvent(messages, { type: 'stream.delta', id: 'a1', delta: 'lo' });
    expect(messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'hi'],
      ['assistant', 'Hello'],
    ]);
  });
});