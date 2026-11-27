// Intervalo adaptativo da sincronizacao em tempo real (sem dependencias de React Native,
// para poder ser testado isoladamente).

/** Quanto o intervalo cresce a cada consulta sem novidade. */
export const BACKOFF_FACTOR = 1.5;

/**
 * Proximo intervalo de consulta: volta ao rapido (`base`) quando houve mudanca;
 * senao cresce aos poucos, sem passar de `max`.
 */
export function nextSyncDelay(current: number, base: number, max: number, changed: boolean): number {
  if (changed) return base;
  const ceiling = Math.max(base, max);
  return Math.min(ceiling, Math.max(base, Math.round(current * BACKOFF_FACTOR)));
}
