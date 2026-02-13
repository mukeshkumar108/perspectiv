export type CharacterState = 'idle' | 'excited' | 'sleepy' | 'thinking';
export type CharacterAlignment = 'right' | 'center';

export interface CharacterProps {
  state?: CharacterState;
  alignment?: CharacterAlignment;
  mood?: number | null;
  accentKey?: number;
  sizeScale?: number;
  liftScale?: number;
  visibleRatio?: number;
}
