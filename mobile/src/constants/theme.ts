// Theme constants for INFUT dark mode — Carbon Neutral system
// Surface ramp: #090B0E -> #101318 -> #14181F -> #1A1F28 -> #222834
// Accent: #F97316

export const colors = {
  // Legacy aliases kept for compatibility
  black: '#000000',
  darkTeal: '#1C222D',
  orange: '#F97316',
  lightGray: '#E2E8F0',

  // Carbon Neutral surface ramp
  background: '#090B0E',
  surface: '#101318',
  surfaceLight: '#1A1F28',
  surfaceElevated: '#222834',
  card: '#14181F',
  cardHover: '#1D222D',

  // Text (WCAG AA compliant contrast on dark surfaces)
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#090B0E',

  // Single Primary Accent
  primary: '#F97316',
  primaryLight: '#FB923C',
  primaryDark: '#EA580C',
  primarySoft: 'rgba(249, 115, 22, 0.14)',

  // Functional (subdued, reserved for state indicators)
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.12)',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.12)',
  warning: '#EAB308',
  warningSoft: 'rgba(234, 179, 8, 0.12)',
  info: '#38BDF8',
  infoSoft: 'rgba(56, 189, 248, 0.12)',

  // Structural borders
  border: '#262D3B',
  borderStrong: '#374155',
  borderLight: '#1C222D',

  // Overlay
  overlay: 'rgba(4, 6, 9, 0.82)',
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
  tabletMaxWidth: 820,
  desktopMaxWidth: 1120,
  authMaxWidth: 460,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
};
