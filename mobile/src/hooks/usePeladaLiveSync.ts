// Mantem a pelada atualizada para todos que estao com a tela aberta.
// Consulta uma versao leve (/peladas/:id/sync) a cada poucos segundos e so recarrega
// a pelada inteira quando algo mudou (presenca, goleiro, times, gols, pagamentos...).
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPeladaSyncVersion } from '../services/peladaService';

interface Options {
  /** versao atual que a tela ja tem (pelada.syncVersion) */
  currentVersion?: string | null;
  /** recarrega a pelada completa */
  reload: () => Promise<unknown> | void;
  /** intervalo em ms (padrao 3s; use menor em telas ao vivo) */
  intervalMs?: number;
  enabled?: boolean;
}

function isDocumentHidden(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

export function usePeladaLiveSync(peladaId: string | undefined, options: Options) {
  const { currentVersion, reload, intervalMs = 3000, enabled = true } = options;
  const versionRef = useRef<string | null | undefined>(currentVersion);
  const reloadRef = useRef(reload);
  const inFlight = useRef(false);

  versionRef.current = currentVersion;
  reloadRef.current = reload;

  const check = useCallback(async () => {
    if (!peladaId || inFlight.current || isDocumentHidden()) return;
    if (AppState.currentState && AppState.currentState !== 'active' && Platform.OS !== 'web') return;
    inFlight.current = true;
    try {
      const { syncVersion } = await getPeladaSyncVersion(peladaId);
      if (versionRef.current && syncVersion !== versionRef.current) {
        versionRef.current = syncVersion;
        await reloadRef.current();
      }
    } catch {
      // rede instavel: tenta de novo no proximo ciclo
    } finally {
      inFlight.current = false;
    }
  }, [peladaId]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !peladaId) return undefined;
      const timer = setInterval(check, intervalMs);

      // ao voltar para o app/aba, confere na hora
      const appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') check();
      });
      let onVisibility: (() => void) | null = null;
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        onVisibility = () => {
          if (document.visibilityState === 'visible') check();
        };
        document.addEventListener('visibilitychange', onVisibility);
      }

      return () => {
        clearInterval(timer);
        appStateSub.remove();
        if (onVisibility && typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }, [check, enabled, intervalMs, peladaId])
  );

  // quando a propria tela recebe uma pelada nova (apos uma acao), atualiza a referencia
  useEffect(() => {
    versionRef.current = currentVersion;
  }, [currentVersion]);
}
