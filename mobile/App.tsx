// Main App Entry
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { RootNavigator } from './src/navigation';
import { colors } from './src/constants/theme';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap';

function surfaceCss() {
  return `
    html, body, #root {
      background-color: ${colors.background};
      color: ${colors.textPrimary};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    ::selection {
      background-color: ${colors.primaryBorder};
      color: ${colors.textPrimary};
    }
    input, textarea { caret-color: ${colors.primary}; }
    * {
      scrollbar-width: thin;
      scrollbar-color: ${colors.borderStrong} transparent;
    }
    *::-webkit-scrollbar { width: 6px; height: 6px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb {
      background-color: ${colors.borderStrong};
      border-radius: 9999px;
    }
    *::-webkit-scrollbar-thumb:hover { background-color: ${colors.primaryBorder}; }
    [role="button"], button, a {
      transition: opacity 140ms ease, transform 140ms ease, background-color 160ms ease, border-color 160ms ease;
    }
    input:focus-visible, textarea:focus-visible, [role="button"]:focus-visible {
      outline: 2px solid ${colors.primary};
      outline-offset: 2px;
    }
  `;
}

/** Fontes e superficies do navegador (selecao, scrollbar, foco) seguem a paleta ativa. */
function WebSurface() {
  const { paletteId } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    let link = document.getElementById('infut-google-fonts') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'infut-google-fonts';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== FONT_HREF) link.href = FONT_HREF;

    let style = document.getElementById('infut-surface-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'infut-surface-styles';
      document.head.appendChild(style);
    }
    style.textContent = surfaceCss();

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', colors.background);
  }, [paletteId]);

  return null;
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'light' ? 'dark' : 'light'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <WebSurface />
          <RootNavigator />
          <ThemedStatusBar />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
