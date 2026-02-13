export type GuidedCategory = 'breathing' | 'meditation';

export interface GuidedSession {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;
  category: GuidedCategory;
  audioSource: number;
}

export const guidedSessions: GuidedSession[] = [
  {
    id: 'breathing-4-7-8',
    title: '4-7-8 Breathing',
    subtitle: 'Inhale 4 • hold 7 • exhale 8',
    durationMin: 2,
    category: 'breathing',
    audioSource: require('../../assets/images/audio/bluum-4-7-8.mp3'),
  },
];
