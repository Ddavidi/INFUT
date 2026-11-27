// src/services/pelada.rules.ts
// Regras puras da pelada (valores, pagamentos, placar e cronometro), sem acesso a banco,
// para poderem ser testadas isoladamente.
import type { LiveMatchState, LiveMatchTimer } from './pelada.service';

export type PricedPelada = {
  price?: number | null;
  priceGoalkeeper?: number | null;
  priceMonthly?: number | null;
  goalkeepersExempt?: boolean;
};

/** Valor que um participante deve pagar conforme o tipo (goleiro, mensalista ou avulso). */
export function getPlayerUnitPrice(
  pelada: PricedPelada,
  player: { isGoalkeeper?: boolean; memberType?: string | null }
): number {
  if (player.isGoalkeeper) {
    if (pelada.priceGoalkeeper !== null && pelada.priceGoalkeeper !== undefined) {
      return Math.max(0, pelada.priceGoalkeeper);
    }
    return pelada.goalkeepersExempt ? 0 : Math.max(0, pelada.price || 0);
  }
  if (player.memberType === 'MENSALISTA') {
    if (pelada.priceMonthly !== null && pelada.priceMonthly !== undefined) {
      return Math.max(0, pelada.priceMonthly);
    }
  }
  return Math.max(0, pelada.price || 0);
}

export function isPeladaFree(pelada: PricedPelada): boolean {
  return (
    !(pelada.price && pelada.price > 0) &&
    !(pelada.priceGoalkeeper && pelada.priceGoalkeeper > 0) &&
    !(pelada.priceMonthly && pelada.priceMonthly > 0)
  );
}

/** Ajusta EXEMPT/PENDING conforme o valor devido; nunca mexe em PAID/WAITING_CONFIRMATION. */
export function resolvePaymentStatus(currentStatus: string | null | undefined, unitPrice: number): string {
  const current = currentStatus || 'PENDING';
  if (current === 'PAID' || current === 'WAITING_CONFIRMATION') return current;
  return unitPrice <= 0 ? 'EXEMPT' : 'PENDING';
}

export function computeLiveScore(live: LiveMatchState) {
  const scoreA = live.events.filter((e) => e.teamName === live.teamAName).length;
  const scoreB = live.events.filter((e) => e.teamName === live.teamBName).length;
  return { scoreA, scoreB };
}

export function getTimerElapsedMs(timer: LiveMatchTimer, now = Date.now()): number {
  const running = timer.running && timer.startedAt ? now - timer.startedAt : 0;
  return Math.max(0, (timer.accumulatedMs || 0) + running);
}

export function newLiveMatch(teamAName: string, teamBName: string): LiveMatchState {
  return {
    teamAName,
    teamBName,
    events: [],
    timer: { running: false, startedAt: null, accumulatedMs: 0 },
  };
}

export interface FinancialSummary {
  unitPrice: number;
  goalkeeperPrice: number;
  monthlyPrice: number;
  totalExpected: number;
  totalPaid: number;
  paidCount: number;
  waitingCount: number;
  pendingCount: number;
  exemptCount: number;
}

type PricedPlayer = { isGoalkeeper?: boolean; memberType?: string | null; paymentStatus?: string | null };

/** Resumo financeiro dos confirmados: quanto se espera receber e quanto ja foi pago. */
export function summarizeFinances(pelada: PricedPelada, confirmedPlayers: PricedPlayer[]): FinancialSummary {
  const priceOf = (p: PricedPlayer) => getPlayerUnitPrice(pelada, p);
  const sumPrices = (list: PricedPlayer[]) =>
    Number(list.reduce((sum, p) => sum + priceOf(p), 0).toFixed(2));
  const byStatus = (status: string) => confirmedPlayers.filter((p) => p.paymentStatus === status);
  const paidPlayers = byStatus('PAID');

  return {
    unitPrice: pelada.price || 0,
    goalkeeperPrice: getPlayerUnitPrice(pelada, { isGoalkeeper: true }),
    monthlyPrice: getPlayerUnitPrice(pelada, { memberType: 'MENSALISTA' }),
    totalExpected: sumPrices(confirmedPlayers.filter((p) => p.paymentStatus !== 'EXEMPT')),
    totalPaid: sumPrices(paidPlayers),
    paidCount: paidPlayers.length,
    waitingCount: byStatus('WAITING_CONFIRMATION').length,
    pendingCount: byStatus('PENDING').length,
    exemptCount: byStatus('EXEMPT').length,
  };
}
