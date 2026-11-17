// Theme constants for INFUT dark mode
// Surface ramp: #070B12 -> #0E1520 -> #121A26 -> #151F2E -> #1C293B
// Accent: #FE7F2D (Orange) + #233D4D (Dark Teal)

export const colors = {
  // Primary palette
  black: '#000000',
  darkTeal: '#233D4D',
  orange: '#FE7F2D',
  lightGray: '#EAECF0',

  // Surface ramp
  background: '#070B12',
  surface: '#0E1520',
  surfaceLight: '#151F2E',
  surfaceElevated: '#1C293B',
  card: '#121A26',
  cardHover: '#1B2738',

  // Text (WCAG AA compliant contrast on dark surfaces)
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#070B12',

  // Accent
  primary: '#FE7F2D',
  primaryLight: '#FF9A52',
  primaryDark: '#E06A1A',
  primarySoft: 'rgba(254, 127, 45, 0.16)',

  // Functional
  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.16)',
  error: '#F87171',
  errorSoft: 'rgba(248, 113, 113, 0.16)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.16)',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.16)',

  // Borders (3:1+ non-text contrast on input/card boundaries)
  border: '#334155',
  borderStrong: '#475569',
  borderLight: '#1E293B',

  // Overlay
  overlay: 'rgba(4, 7, 12, 0.78)',
};

export const fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
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
  xl: 24,
  full: 9999,
};

export const layout = {
  maxWidth: 680,
  authMaxWidth: 460,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
};
