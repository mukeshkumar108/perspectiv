import { useColorScheme } from 'react-native';
import { colors, type Colors } from './tokens';

export function useTheme(): Colors {
  const colorScheme = useColorScheme();
  return colors[colorScheme === 'dark' ? 'dark' : 'light'];
}

export function useIsDarkMode(): boolean {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark';
}
