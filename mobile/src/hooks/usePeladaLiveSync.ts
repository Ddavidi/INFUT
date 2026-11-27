// Mantem a pelada atualizada para todos que estao com a tela aberta.
// Consulta uma versao leve (/peladas/:id/sync) e so recarrega a pelada inteira quando
// algo mudou (presenca, goleiro, times, gols, pagamentos...).
//
// Para nao gastar servidor/banco a toa, o intervalo e adaptativo: comeca em `intervalMs`
// e, a cada consulta sem novidade, cresce ate `maxIntervalMs`. Qualquer mudanca (vinda de
// outra pessoa ou de uma acao nesta tela) volta para o intervalo rapido. Com a aba/app em
// segundo plano nao consulta nada; ao voltar, confere na hora.
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPeladaSyncVersion } from '../services/peladaService';
import { nextSyncDelay } from '../utils/syncBackoff';

interface Options {
  /** versao atual que a tela ja tem (pelada.syncVersion) */
  currentVersion?: string | null;
  /** recarrega a pelada completa */
  reload: () => Promise<unknown> | void;
  /** intervalo rapido em ms, usado logo apos uma mudanca (padrao 3s) */
  intervalMs?: number;
  /** intervalo maximo em ms quando nada muda por um tempo (padrao 8s) */
  maxIntervalMs?: number;
  enabled?: boolean;
}


function isDocumentHidden(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

function isAppInBackground(): boolean {
  return Platform.OS !== 'web' && !!AppState.currentState && AppState.currentState !== 'active';
}

export function usePeladaLiveSync(peladaId: string | undefined, options: Options) {
  const { currentVersion, reload, intervalMs = 3000, maxIntervalMs = 8000, enabled = true } = options;
  const versionRef = useRef<string | null | undefined>(currentVersion);
  const reloadRef = useRef(reload);
  const inFlight = useRef(false);
  const delayRef = useRef(intervalMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const limitsRef = useRef({ base: intervalMs, max: maxIntervalMs });
  const checkRef = useRef<() => Promise<void>>(async () => {});

  reloadRef.current = reload;
  limitsRef.current = { base: intervalMs, max: maxIntervalMs };

  const schedule = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!activeRef.current) return;
    timerRef.current = setTimeout(() => void checkRef.current(), delay);
  }, []);

  const check = useCallback(async () => {
    if (!peladaId || !activeRef.current) return;
    // em segundo plano: nao consulta; o listener de visibilidade/AppState retoma
    if (isDocumentHidden() || isAppInBackground()) return;
    if (inFlight.current) return;

    inFlight.current = true;
    let changed = false;
    try {
      const { syncVersion } = await getPeladaSyncVersion(peladaId);
      if (versionRef.current && syncVersion !== versionRef.current) {
        changed = true;
        versionRef.current = syncVersion;
        await reloadRef.current();
      }
    } catch {
      // rede instavel: tenta de novo no proximo ciclo (com o intervalo crescendo)
    } finally {
      inFlight.current = false;
    }

    const { base, max } = limitsRef.current;
    delayRef.current = nextSyncDelay(delayRef.current, base, max, changed);
    schedule(delayRef.current);
  }, [peladaId, schedule]);
  checkRef.current = check;

  /** Volta ao intervalo rapido e confere ja. */
  const wakeUp = useCallback(() => {
    delayRef.current = limitsRef.current.base;
    void check();
  }, [check]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !peladaId) return undefined;
      activeRef.current = true;
      delayRef.current = limitsRef.current.base;
      schedule(delayRef.current);

      const appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') wakeUp();
      });
      let onVisibility: (() => void) | null = null;
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        onVisibility = () => {
          if (document.visibilityState === 'visible') wakeUp();
        };
        document.addEventListener('visibilitychange', onVisibility);
      }

      return () => {
        activeRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        appStateSub.remove();
        if (onVisibility && typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }, [enabled, peladaId, schedule, wakeUp])
  );

  // A tela recebeu uma pelada nova (apos uma acao aqui): atualiza a referencia e volta
  // ao intervalo rapido, porque e provavel que outras mudancas venham em seguida.
  useEffect(() => {
    if (currentVersion === versionRef.current) return;
    versionRef.current = currentVersion;
    delayRef.current = limitsRef.current.base;
    schedule(delayRef.current);
  }, [currentVersion, schedule]);

  // Limites mudaram (ex.: cronometro comecou a rodar): aplica o intervalo rapido na hora.
  useEffect(() => {
    delayRef.current = Math.min(delayRef.current, maxIntervalMs);
    if (delayRef.current < intervalMs) delayRef.current = intervalMs;
    schedule(delayRef.current);
  }, [intervalMs, maxIntervalMs, schedule]);
}
