// Paleta de cores escolhida pelo usuario (salva no aparelho).
// Ao trocar, os tokens sao atualizados no lugar e a arvore de telas e remontada
// (a navegacao guarda o estado, entao o usuario continua na mesma tela).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyPalette,
  isPaletteId,
  Palette,
  PaletteId,
  paletteList,
  palettes,
  PALETTE_STORAGE_KEY,
  themeState,
  ThemeMode,
} from '../constants/theme';

interface ThemeContextValue {
  paletteId: PaletteId;
  palette: Palette;
  mode: ThemeMode;
  palettes: Palette[];
  setPalette: (id: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function persistPalette(id: PaletteId) {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } else {
      await AsyncStorage.setItem(PALETTE_STORAGE_KEY, id);
    }
  } catch {
    // sem armazenamento: a paleta vale so ate fechar o app
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteId] = useState<PaletteId>(themeState.paletteId);
  // na web a paleta salva ja foi lida de forma sincrona em theme.ts
  const [ready, setReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    AsyncStorage.getItem(PALETTE_STORAGE_KEY)
      .then((saved) => {
        if (!active) return;
        if (isPaletteId(saved) && saved !== themeState.paletteId) {
          applyPalette(saved);
          setPaletteId(saved);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    if (id === themeState.paletteId) return;
    applyPalette(id);
    setPaletteId(id);
    persistPalette(id);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      paletteId,
      palette: palettes[paletteId],
      mode: palettes[paletteId].mode,
      palettes: paletteList,
      setPalette,
    }),
    [paletteId, setPalette]
  );

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={value}>
      <React.Fragment key={paletteId}>{children}</React.Fragment>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de ThemeProvider');
  return ctx;
}
