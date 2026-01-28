/**
 * Design Tokens
 * 8pt spacing system, premium typography, clean color palette
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  hero: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
} as const;

// Clean, premium color palette
export const colors = {
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#F8F8F8',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textTertiary: '#9A9A9A',
    border: '#E8E8E8',
    borderLight: '#F0F0F0',
    primary: '#2D2D2D',
    primaryText: '#FFFFFF',
    accent: '#7C9A8E', // Muted sage green
    accentLight: '#E8F0EC',
    error: '#C45C5C',
    errorLight: '#FCEAEA',
    success: '#5C8C6C',
    successLight: '#E8F5EC',
  },
  dark: {
    background: '#0A0A0A',
    backgroundSecondary: '#141414',
    surface: '#1A1A1A',
    text: '#FAFAFA',
    textSecondary: '#A0A0A0',
    textTertiary: '#6B6B6B',
    border: '#2A2A2A',
    borderLight: '#1F1F1F',
    primary: '#FAFAFA',
    primaryText: '#0A0A0A',
    accent: '#8FB3A4', // Lighter sage for dark mode
    accentLight: '#1A2420',
    error: '#E07070',
    errorLight: '#2A1A1A',
    success: '#70B080',
    successLight: '#1A2A1E',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type Colors = {
  background: string;
  backgroundSecondary: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryText: string;
  accent: string;
  accentLight: string;
  error: string;
  errorLight: string;
  success: string;
  successLight: string;
};
