// Tema do INFUT com paletas trocaveis.
//
// `colors` e `shadows` sao objetos mutaveis: applyPalette() troca os valores no lugar
// e incrementa a versao do tema. Os estilos das telas sao criados com themed(() => StyleSheet.create(...)),
// que recalcula o StyleSheet quando a versao muda. Assim toda a interface segue a paleta escolhida.
//
// Papeis de cor (nao misture):
//   primary  -> marca e acao principal (botao principal, aba ativa, selecao, foco)
//   success  -> confirmado, pago, vagas abertas
//   warning  -> pendente, lista de espera, alerta de regra
//   error    -> ao vivo, recusa, acao destrutiva
//   info     -> goleiro, informacao neutra, proxima pelada
//   gold     -> MVP, 1o lugar, sequencia de vitorias
//   texto/superficies -> todo o resto (icones decorativos, voltar, codigos, rotulos)

import { Platform } from 'react-native';

export type PaletteId = 'classico' | 'canarinho' | 'celeste' | 'gramado' | 'dia';
export type ThemeMode = 'dark' | 'light';

interface PaletteBase {
  background: string;
  surface: string;
  card: string;
  cardHover: string;
  surfaceLight: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  gold: string;
}

export interface Palette {
  id: PaletteId;
  name: string;
  description: string;
  mode: ThemeMode;
  base: PaletteBase;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const palettes: Record<PaletteId, Palette> = {
  classico: {
    id: 'classico',
    name: 'Noite de Jogo',
    description: 'Azul-marinho com laranja de bola. O padrão do INFUT.',
    mode: 'dark',
    base: {
      background: '#0A0D14',
      surface: '#0F131C',
      card: '#141925',
      cardHover: '#1A2030',
      surfaceLight: '#1B2231',
      surfaceElevated: '#252D3E',
      textPrimary: '#F2F4F8',
      textSecondary: '#B1BACB',
      textMuted: '#808BA1',
      textInverse: '#1C0C00',
      primary: '#FF7A1A',
      primaryLight: '#FF9447',
      primaryDark: '#E5640A',
      success: '#2FD47A',
      error: '#F2495C',
      warning: '#F5B83D',
      info: '#4CB8F5',
      gold: '#FFCB3D',
    },
  },
  canarinho: {
    id: 'canarinho',
    name: 'Canarinho',
    description: 'Azul profundo com amarelo de camisa da seleção.',
    mode: 'dark',
    base: {
      background: '#06111F',
      surface: '#0A1828',
      card: '#0F1E31',
      cardHover: '#14263D',
      surfaceLight: '#15283F',
      surfaceElevated: '#1D3452',
      textPrimary: '#F1F5FA',
      textSecondary: '#AFC0D4',
      textMuted: '#7E93AB',
      textInverse: '#1A1400',
      primary: '#FFD33D',
      primaryLight: '#FFE073',
      primaryDark: '#E6B800',
      success: '#2FD47A',
      error: '#FF5A6A',
      warning: '#FF9F43',
      info: '#5CC8FF',
      gold: '#FFB020',
    },
  },
  celeste: {
    id: 'celeste',
    name: 'Celeste',
    description: 'Grafite neutro com azul-celeste. Calmo e limpo.',
    mode: 'dark',
    base: {
      background: '#0C0D10',
      surface: '#121419',
      card: '#171A20',
      cardHover: '#1D2129',
      surfaceLight: '#1F232B',
      surfaceElevated: '#292E38',
      textPrimary: '#F3F4F6',
      textSecondary: '#B5BAC4',
      textMuted: '#858C99',
      textInverse: '#04121F',
      primary: '#5AB0FF',
      primaryLight: '#86C5FF',
      primaryDark: '#3593F0',
      success: '#34D27F',
      error: '#F4566A',
      warning: '#F6B444',
      info: '#A78BFA',
      gold: '#FACC15',
    },
  },
  gramado: {
    id: 'gramado',
    name: 'Gramado',
    description: 'O verde de campo iluminado, a paleta anterior.',
    mode: 'dark',
    base: {
      background: '#070A0D',
      surface: '#0D1217',
      card: '#121820',
      cardHover: '#19222E',
      surfaceLight: '#18202B',
      surfaceElevated: '#1F2937',
      textPrimary: '#F4F7FA',
      textSecondary: '#B4C0CE',
      textMuted: '#7D8B9D',
      textInverse: '#04120B',
      primary: '#16D97C',
      primaryLight: '#34EEA0',
      primaryDark: '#0EA860',
      success: '#16D97C',
      error: '#F43F5E',
      warning: '#F59E0B',
      info: '#38BDF8',
      gold: '#FBBF24',
    },
  },
  dia: {
    id: 'dia',
    name: 'Dia de Jogo',
    description: 'Tema claro para ler no sol, na beira da quadra.',
    mode: 'light',
    base: {
      background: '#F2F3F6',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      cardHover: '#F7F8FA',
      surfaceLight: '#EBEEF3',
      surfaceElevated: '#DFE3EA',
      textPrimary: '#111827',
      textSecondary: '#3E4A5C',
      textMuted: '#5E6878',
      textInverse: '#FFFFFF',
      primary: '#C2410C',
      primaryLight: '#EA580C',
      primaryDark: '#9A3412',
      success: '#15803D',
      error: '#DC2626',
      warning: '#B45309',
      info: '#0369A1',
      gold: '#A16207',
    },
  },
};

export const paletteList: Palette[] = [
  palettes.classico,
  palettes.canarinho,
  palettes.celeste,
  palettes.gramado,
  palettes.dia,
];

export const DEFAULT_PALETTE: PaletteId = 'classico';
export const PALETTE_STORAGE_KEY = 'infut.palette';

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(palettes, value);
}

function buildColors(p: Palette) {
  const b = p.base;
  const light = p.mode === 'light';
  const ink = light ? '#111827' : '#FFFFFF';
  const soft = light ? 0.1 : 0.13;
  const edge = light ? 0.35 : 0.34;
  return {
    // Aliases antigos mantidos por compatibilidade
    black: '#000000',
    darkTeal: b.surfaceLight,
    orange: b.primary,
    lightGray: b.textSecondary,

    background: b.background,
    surface: b.surface,
    surfaceLight: b.surfaceLight,
    surfaceElevated: b.surfaceElevated,
    card: b.card,
    cardHover: b.cardHover,

    textPrimary: b.textPrimary,
    textSecondary: b.textSecondary,
    textMuted: b.textMuted,
    textInverse: b.textInverse,

    primary: b.primary,
    primaryLight: b.primaryLight,
    primaryDark: b.primaryDark,
    primarySoft: alpha(b.primary, soft),
    primaryBorder: alpha(b.primary, edge),

    gold: b.gold,
    goldSoft: alpha(b.gold, soft),
    goldBorder: alpha(b.gold, edge),

    success: b.success,
    successSoft: alpha(b.success, soft),
    successBorder: alpha(b.success, edge),
    error: b.error,
    errorSoft: alpha(b.error, soft),
    errorBorder: alpha(b.error, edge),
    warning: b.warning,
    warningSoft: alpha(b.warning, soft),
    warningBorder: alpha(b.warning, edge),
    info: b.info,
    infoSoft: alpha(b.info, soft),
    infoBorder: alpha(b.info, edge),

    border: alpha(ink, light ? 0.1 : 0.08),
    borderStrong: alpha(ink, light ? 0.18 : 0.15),
    borderLight: alpha(ink, light ? 0.06 : 0.05),

    overlay: light ? 'rgba(17, 24, 39, 0.55)' : 'rgba(3, 6, 9, 0.84)',
  };
}

export type ThemeColors = ReturnType<typeof buildColors>;

function readInitialPalette(): PaletteId {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(PALETTE_STORAGE_KEY);
      if (isPaletteId(saved)) return saved;
    } catch {
      // armazenamento bloqueado: usa o padrao
    }
  }
  return DEFAULT_PALETTE;
}

const initialPalette = readInitialPalette();

export const themeState = {
  version: 0,
  paletteId: initialPalette as PaletteId,
  mode: palettes[initialPalette].mode as ThemeMode,
};

export const colors: ThemeColors = buildColors(palettes[initialPalette]);

const webFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const webDisplayFont = "'Barlow Condensed', -apple-system, 'Segoe UI', sans-serif";

export const fonts = {
  regular: Platform.OS === 'web' ? webFont : 'System',
  medium: Platform.OS === 'web' ? webFont : 'System',
  bold: Platform.OS === 'web' ? webFont : 'System',
  /** Placar, cronometro e numeros grandes (estilo placar de estadio) */
  display: Platform.OS === 'web' ? webDisplayFont : 'System',
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

function buildShadows(p: Palette) {
  const light = p.mode === 'light';
  return {
    card: {
      shadowColor: light ? '#1F2937' : '#000000',
      shadowOffset: { width: 0, height: light ? 2 : 6 },
      shadowOpacity: light ? 0.07 : 0.28,
      shadowRadius: light ? 8 : 14,
      elevation: light ? 2 : 4,
    },
    elevated: {
      shadowColor: light ? '#1F2937' : '#000000',
      shadowOffset: { width: 0, height: light ? 8 : 12 },
      shadowOpacity: light ? 0.12 : 0.42,
      shadowRadius: light ? 20 : 24,
      elevation: 8,
    },
    primaryGlow: {
      shadowColor: p.base.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: light ? 0.18 : 0.22,
      shadowRadius: 14,
      elevation: 5,
    },
  };
}

export const shadows = buildShadows(palettes[initialPalette]);

/** Troca a paleta ativa no lugar. Quem chama deve re-renderizar a arvore (ThemeProvider faz isso). */
export function applyPalette(id: PaletteId) {
  const palette = palettes[id];
  Object.assign(colors, buildColors(palette));
  const nextShadows = buildShadows(palette);
  (Object.keys(nextShadows) as (keyof typeof nextShadows)[]).forEach((key) => {
    Object.assign(shadows[key], nextShadows[key]);
  });
  themeState.paletteId = id;
  themeState.mode = palette.mode;
  themeState.version += 1;
}

/**
 * Cria estilos que acompanham a paleta: `const styles = themed(() => StyleSheet.create({...}))`.
 * O StyleSheet e recriado na primeira leitura depois de cada troca de paleta.
 */
export function themed<T extends object>(factory: () => T): T {
  let cachedVersion = -1;
  let cached: T;
  const current = (): T => {
    if (cachedVersion !== themeState.version) {
      cached = factory();
      cachedVersion = themeState.version;
    }
    return cached;
  };
  return new Proxy({} as T, {
    get: (_target, key) => (current() as any)[key],
    has: (_target, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(current(), key);
      if (descriptor) descriptor.configurable = true;
      return descriptor;
    },
  });
}
