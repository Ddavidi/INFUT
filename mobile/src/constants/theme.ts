// Theme constants for INFUT — "Night Pitch" Design System
// Inspired by floodlit nighttime courts: Deep Obsidian surfaces + Floodlight Emerald accent
// Surface ramp: #070A0D -> #0D1217 -> #121820 -> #18202B -> #1F2937
// Primary Accent: #16D97C | Championship Gold: #FBBF24 | Matchday Crimson: #F43F5E

import { Platform } from 'react-native';

export const colors = {
  // Legacy aliases kept for compatibility
  black: '#000000',
  darkTeal: '#18202B',
  orange: '#16D97C',
  lightGray: '#E2E8F0',

  // Night Pitch obsidian surface ramp
  background: '#070A0D',
  surface: '#0D1217',
  surfaceLight: '#18202B',
  surfaceElevated: '#1F2937',
  card: '#121820',
  cardHover: '#19222E',

  // Typography (WCAG AA/AAA compliant contrast on dark surfaces)
  textPrimary: '#F4F7FA',
  textSecondary: '#B4C0CE',
  textMuted: '#7D8B9D',
  textInverse: '#04120B',

  // Primary Accent — Floodlight Emerald
  primary: '#16D97C',
  primaryLight: '#34EEA0',
  primaryDark: '#0EA860',
  primarySoft: 'rgba(22, 217, 124, 0.12)',
  primaryBorder: 'rgba(22, 217, 124, 0.32)',

  // Secondary Accent — Championship Gold (MVP & #1 Rank only)
  gold: '#FBBF24',
  goldSoft: 'rgba(251, 191, 36, 0.12)',
  goldBorder: 'rgba(251, 191, 36, 0.32)',

  // Functional Semantic Colors
  success: '#16D97C',
  successSoft: 'rgba(22, 217, 124, 0.12)',
  error: '#F43F5E',
  errorSoft: 'rgba(244, 63, 94, 0.13)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.13)',
  info: '#38BDF8',
  infoSoft: 'rgba(56, 189, 248, 0.12)',

  // Hairline Structural Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  // Modal Scrim
  overlay: 'rgba(3, 6, 9, 0.84)',
};

const webFont = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const fonts = {
  regular: Platform.OS === 'web' ? webFont : 'System',
  medium: Platform.OS === 'web' ? webFont : 'System',
  bold: Platform.OS === 'web' ? webFont : 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    title: 40,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
};

export const layout = {
  maxWidth: 680,
  tabletMaxWidth: 860,
  desktopMaxWidth: 1140,
  authMaxWidth: 440,
};

export const motion = {
  fast: 110,
  normal: 220,
  slow: 340,
  pressScale: 0.975,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryGlow: {
    shadowColor: '#16D97C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 5,
  },
};
