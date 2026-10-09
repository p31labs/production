/**
 * SplitEditor stories — the split-pane markdown editor + live preview.
 */
import { Meta, Story } from '@ladle/react';
import { SplitEditor } from './SplitEditor';

import './_stories.css.ts';

export const meta: Meta = {
  title: 'Playground/SplitEditor',
};

const SAMPLE = `# Research Report

## Summary

A plain-language summary goes here.

## Consensus

- What the briefs agree on.

## Divergence

- Where they differ.
`;

export const Desktop: Story = () => (
  <SplitEditor value={SAMPLE} onChange={() => {}} theme="ocean" minHeight="24rem" />
);

export const Midstacked: Story = () => (
  <SplitEditor value={SAMPLE} onChange={() => {}} theme="volt" minHeight="16rem" />
);
Midstacked.storyName = 'Stacked (set spoons<=1 for the stacked layout)';