/**
 * PackCard stories — a single catalog pack, all 6 kinds.
 */
import { Meta, Story } from '@ladle/react';
import { PackCard, type ManifestPack } from './PackCard';

import './_stories.css.ts';

export const meta: Meta = {
  title: 'Catalog/PackCard',
};

const base: ManifestPack = {
  id: 'demo',
  kind: 'research',
  title: 'Sovereign Stack Governance',
  filename: 'p31-governance-0.3.0.docx',
  date: '2026-09-30',
  theme: 'scene',
  source: 'jitterbug',
};

export const Research: Story = () => <PackCard pack={base} />;
export const Omnibus: Story = () => (
  <PackCard pack={{ ...base, id: 'demo-2', kind: 'omnibus', title: 'Family Compendium', filename: 'family-compendium.docx' }} />
);
export const Legal: Story = () => (
  <PackCard pack={{ ...base, id: 'demo-3', kind: 'legal', title: 'Guardianship Memo', filename: 'guardianship.docx' }} />
);
export const Governance: Story = () => (
  <PackCard pack={{ ...base, id: 'demo-4', kind: 'governance', title: 'Board Resolution', filename: 'resolution.docx' }} />
);
export const NoDate: Story = () => (
  <PackCard pack={{ ...base, id: 'demo-5', date: null, title: 'Draft — no date' }} />
);