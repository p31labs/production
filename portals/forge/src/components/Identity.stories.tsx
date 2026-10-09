/**
 * Identity stories — the PQC identity surface.
 * NOTE: reads IndexedDB on mount; Ladle sandbox has no storage, so the
 * story renders the "no identity" empty state. That is the story.
 */
import { Meta, Story } from '@ladle/react';
import Identity from '../routes/Identity';

import './_stories.css.ts';

export const meta: Meta = {
  title: 'Playground/Identity',
};

export const EmptyState: Story = () => <Identity />;