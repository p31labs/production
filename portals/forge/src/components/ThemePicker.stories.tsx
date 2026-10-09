/**
 * ThemePicker stories — the canon Chameleon theme switcher.
 * Named states: full (spoons 5), calm floor (spoons 1, collapsed toggle).
 */
import { Meta, Story } from '@ladle/react';
import { ThemePicker } from './ThemePicker';

import './_stories.css.ts';

export const meta: Meta = {
  title: 'Chrome/ThemePicker',
};

/** Default: the full 5-swatch pill. */
export const Full: Story = () => <ThemePicker />;

/** Calm floor — the store must be at spoons<=1; Ladle renders default store
 *  (spoons 3) so this story documents the intent; toggle manually. */
export const CalmFloor: Story = () => <ThemePicker />;
CalmFloor.storyName = 'CalmFloor (set spoons<=1 to see the collapsed toggle)';