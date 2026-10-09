export const A2UI_COMPONENTS = [
  'Button',
  'Card',
  'Form',
  'List',
  'Badge',
  'ProgressBar',
  'Modal',
  'Table',
  'Tabs',
  'Toast',
  'Meter',
  'Grid',
  'DataCard',
] as const;

export type A2UIComponentName = (typeof A2UI_COMPONENTS)[number];

export interface A2UIElement {
  id: string;
  component: A2UIComponentName;
  props?: Record<string, any>;
  children?: string[];
}
