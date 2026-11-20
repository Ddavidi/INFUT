// Main App Entry
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation';
import { colors } from './src/constants/theme';

function useWebSurfacePolish() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // Load Plus Jakarta Sans font for web runtime (dev + prod)
    if (!document.getElementById('infut-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'infut-google-fonts';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }

    // Theme browser surfaces: selection, scrollbar, focus rings, smooth transitions
    if (!document.getElementById('infut-surface-styles')) {
      const style = document.createElement('style');
      style.id = 'infut-surface-styles';
      style.textContent = `
        html, body, #root {
          background-color: ${colors.background};
          color: ${colors.textPrimary};
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        ::selection {
          background-color: rgba(22, 217, 124, 0.28);
          color: #F4F7FA;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
        }
        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.14);
          border-radius: 9999px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background-color: rgba(22, 217, 124, 0.45);
        }
        [role="button"], button, a {
          transition: opacity 140ms ease, transform 140ms ease, background-color 160ms ease, border-color 160ms ease;
        }
        input:focus-visible, textarea:focus-visible, [role="button"]:focus-visible {
          outline: 2px solid ${colors.primary};
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

export default function App() {
  useWebSurfacePolish();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
