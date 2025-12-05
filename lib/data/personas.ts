import { Persona } from '../types';

export const personas: Persona[] = [
  {
    id: 'gen-z-creator',
    name: 'Alex Chen',
    avatarColor: '#8b5cf6',
    description: 'Gen Z content creator who values authenticity and quick interactions',
    goals: [
      'Get set up as quickly as possible',
      'Understand what each feature does without reading long text',
      'Skip unnecessary steps',
    ],
    preferences: [
      'Visual indicators over text explanations',
      'Straightforward language',
      'Mobile-first thinking',
      'Expects intuitive UX',
    ],
    painPoints: [
      'Jargon and corporate speak',
      'Unclear button purposes',
      'Too many choices at once',
      'Forced to make decisions without context',
    ],
    tone: 'Casual, direct, slightly impatient. Uses phrases like "wait, what does this mean?", "okay I guess?", "this is confusing"',
  },
  {
    id: 'busy-parent',
    name: 'Maria Rodriguez',
    avatarColor: '#f59e0b',
    description: 'Working parent with limited time, needs clear guidance',
    goals: [
      'Complete setup efficiently during a short break',
      'Understand what she\'s signing up for',
      'Feel confident in her choices',
    ],
    preferences: [
      'Clear explanations of what each option means',
      'Helper text and tooltips',
      'Ability to go back and change decisions',
      'Visual confirmation of progress',
    ],
    painPoints: [
      'Ambiguous labels that require guessing',
      'Not knowing if she can change settings later',
      'Missing the primary action button',
      'Technical terms without explanations',
    ],
    tone: 'Thoughtful, cautious, seeks reassurance. Uses phrases like "I\'m not sure what this means", "Can I change this later?", "I hope I\'m choosing the right option"',
  },
  {
    id: 'non-native-speaker',
    name: 'Raj Patel',
    avatarColor: '#10b981',
    description: 'Professional non-native English speaker, careful reader',
    goals: [
      'Understand each step before proceeding',
      'Make informed decisions',
      'Avoid mistakes that might be hard to undo',
    ],
    preferences: [
      'Simple, clear language',
      'Consistent terminology',
      'Visual cues and icons',
      'Concrete examples over abstract concepts',
    ],
    painPoints: [
      'Overly complex vocabulary',
      'Similar-sounding options that are hard to differentiate',
      'Metaphors and idioms',
      'Lack of clear primary actions',
    ],
    tone: 'Methodical, careful, rereads text. Uses phrases like "Let me read this again", "These options sound very similar", "I need to think about this"',
  },
];

export function getPersonaById(id: string): Persona | undefined {
  return personas.find((p) => p.id === id);
}

