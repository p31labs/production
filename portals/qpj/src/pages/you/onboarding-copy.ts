export const KEY_LOSS_COPY =
  'Your key lives on this device. If you lose it, there is no backup — ask someone you trust to help you make a new one.';

export interface OnboardingStepCopy {
  key: 'passport' | 'label' | 'hue' | 'keys';
  eyebrow: string;
  heading: string;
  body: string;
  consequence: string;
}

export const ONBOARDING_STEPS: OnboardingStepCopy[] = [
  {
    key: 'passport',
    eyebrow: 'Who is using this?',
    heading: 'Choose a shelf',
    body: 'Every jar has its own shelf. Pick whose this device belongs to.',
    consequence: 'This device now speaks for one shelf. You can switch shelves any time from the top menu.',
  },
  {
    key: 'label',
    eyebrow: 'What should we call you?',
    heading: 'Set your label',
    body: 'A name and an icon are all a shelf needs to get started.',
    consequence: 'You will show up by this label on the street.',
  },
  {
    key: 'hue',
    eyebrow: 'Pick your color',
    heading: 'Warm your corner',
    body: 'Colors are how the house tells shelves apart at a glance.',
    consequence: 'Your hue is set — the whole house shifts to it.',
  },
  {
    key: 'keys',
    eyebrow: 'Keys ready',
    heading: 'Make your key',
    body: 'Your identity is a did:key written onto this device. Nothing guessable, nothing to remember.',
    consequence: KEY_LOSS_COPY,
  },
];

export function getAllOnboardingCopy(): string {
  const pieces = [...ONBOARDING_STEPS.map((s) => [s.eyebrow, s.heading, s.body, s.consequence]), KEY_LOSS_COPY];
  return pieces.flat().join(' ');
}