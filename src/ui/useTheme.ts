import { colors, type Colors } from './tokens';

// Paper/editorial theme - always light for now
export function useTheme(): Colors {
  return colors.light;
}

export function useIsDarkMode(): boolean {
  return false;
}
