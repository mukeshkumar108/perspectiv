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
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '200' as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
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

// Paper/editorial light theme - warm, premium, minimal
export const colors = {
  light: {
    // Bold warm palette
    background: '#FFDC61',
    backgroundSecondary: '#D79637',
    surface: '#FFFFFF',
    text: '#231E15',
    textSecondary: '#231E15',
    textTertiary: '#6F675C',
    border: '#DBD9D2',
    borderLight: '#F0F0EB',
    // Primary button
    primary: '#231E15',
    primaryText: '#FFFFFF',
    // Accent highlights
    accent: '#D79637',
    accentLight: '#FFDC61',
    // Warm error/success
    error: '#B85C5C',
    errorLight: '#F8EEEE',
    success: '#6B9B73',
    successLight: '#F0F7F1',
  },
  // Keep dark theme as fallback (not actively used)
  dark: {
    background: '#1A1918',
    backgroundSecondary: '#242320',
    surface: '#2C2A26',
    text: '#FAF9F7',
    textSecondary: '#A8A69E',
    textTertiary: '#6B6965',
    border: '#3D3B36',
    borderLight: '#2C2A26',
    primary: '#FAF9F7',
    primaryText: '#1A1918',
    accent: '#8FA894',
    accentLight: '#2A322C',
    error: '#D87070',
    errorLight: '#2A2020',
    success: '#70A87A',
    successLight: '#202A22',
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
