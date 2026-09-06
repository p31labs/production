import type { Preview } from '@storybook/react-vite';
import '../src/css/all.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'p31-void',
      values: [
        { name: 'p31-void', value: '#0A0A0F' },
        { name: 'caretaker', value: '#FAFAF8' },
      ],
    },
  },
  globalTypes: {
    spoons: {
      description: 'Cognitive load level (data-spoons on html)',
      toolbar: {
        title: 'Spoons',
        icon: 'battery',
        items: [
          { value: '0', title: '0 — Crisis' },
          { value: '1', title: '1 — Minimal' },
          { value: '2', title: '2 — Low' },
          { value: '3', title: '3 — Moderate' },
          { value: '4', title: '4 — High' },
          { value: '5', title: '5 — Full' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.setAttribute('data-spoons', context.globals.spoons ?? '3');
      return Story();
    },
  ],
};

export default preview;
