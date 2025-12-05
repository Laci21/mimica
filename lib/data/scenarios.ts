import { Scenario } from '../types';

export const scenarios: Scenario[] = [
  {
    id: 'complete-onboarding',
    title: 'Complete Onboarding',
    description: 'Walk through the entire FocusFlow onboarding process and set up preferences',
    targetOutcome: 'User successfully reaches the confirmation screen and completes setup',
  },
  {
    id: 'quick-setup',
    title: 'Quick Setup',
    description: 'Get through onboarding as quickly as possible, skipping optional steps',
    targetOutcome: 'User reaches the end with minimal time spent, potentially skipping steps',
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}

