import { describe, expect, it } from 'vitest';
import {
  computeLiveScore,
  getPlayerUnitPrice,
  getTimerElapsedMs,
  isPeladaFree,
  newLiveMatch,
  resolvePaymentStatus,
  summarizeFinances,
} from '../pelada.rules';
import type { LiveGoalEvent } from '../pelada.service';

describe('getPlayerUnitPrice', () => {
  const pelada = { price: 20, priceGoalkeeper: 10, priceMonthly: 15 };

  it('avulso paga o valor avulso', () => {
    expect(getPlayerUnitPrice(pelada, { memberType: 'DIARISTA' })).toBe(20);
    expect(getPlayerUnitPrice(pelada, {})).toBe(20);
  });

  it('goleiro paga o valor de goleiro, mesmo sendo mensalista', () => {
    expect(getPlayerUnitPrice(pelada, { isGoalkeeper: true })).toBe(10);
    expect(getPlayerUnitPrice(pelada, { isGoalkeeper: true, memberType: 'MENSALISTA' })).toBe(10);
  });

  it('mensalista paga o valor mensal', () => {
    expect(getPlayerUnitPrice(pelada, { memberType: 'MENSALISTA' })).toBe(15);
  });

  it('valor de goleiro zero deixa o goleiro isento', () => {
    expect(getPlayerUnitPrice({ price: 20, priceGoalkeeper: 0 }, { isGoalkeeper: true })).toBe(0);
  });

  it('valor de goleiro vazio cai no avulso, a menos que goleiros sejam isentos', () => {
    expect(getPlayerUnitPrice({ price: 20, priceGoalkeeper: null }, { isGoalkeeper: true })).toBe(20);
    expect(
      getPlayerUnitPrice({ price: 20, priceGoalkeeper: null, goalkeepersExempt: true }, { isGoalkeeper: true })
    ).toBe(0);
  });

  it('valor mensal vazio cai no avulso', () => {
    expect(getPlayerUnitPrice({ price: 20, priceMonthly: null }, { memberType: 'MENSALISTA' })).toBe(20);
  });

  it('nunca devolve valor negativo', () => {
    expect(getPlayerUnitPrice({ price: -5 }, {})).toBe(0);
    expect(getPlayerUnitPrice({ price: 20, priceMonthly: -1 }, { memberType: 'MENSALISTA' })).toBe(0);
  });
});

describe('isPeladaFree', () => {
  it('so e gratis quando nenhum dos tres valores e positivo', () => {
    expect(isPeladaFree({})).toBe(true);
    expect(isPeladaFree({ price: 0, priceGoalkeeper: null, priceMonthly: 0 })).toBe(true);
    expect(isPeladaFree({ price: 0, priceMonthly: 50 })).toBe(false);
    expect(isPeladaFree({ priceGoalkeeper: 5 })).toBe(false);
  });
});

describe('resolvePaymentStatus', () => {
  it('nunca mexe em quem ja pagou ou esta em analise', () => {
    expect(resolvePaymentStatus('PAID', 0)).toBe('PAID');
    expect(resolvePaymentStatus('WAITING_CONFIRMATION', 0)).toBe('WAITING_CONFIRMATION');
  });

  it('isenta quando o valor e zero e pede pagamento quando e positivo', () => {
    expect(resolvePaymentStatus('PENDING', 0)).toBe('EXEMPT');
    expect(resolvePaymentStatus('EXEMPT', 20)).toBe('PENDING');
    expect(resolvePaymentStatus(null, 20)).toBe('PENDING');
  });
});

describe('summarizeFinances', () => {
  const pelada = { price: 20, priceGoalkeeper: 10, priceMonthly: 15 };

  it('soma o esperado por tipo de jogador e separa o que ja foi pago', () => {
    const summary = summarizeFinances(pelada, [
      { memberType: 'DIARISTA', paymentStatus: 'PAID' }, // 20
      { memberType: 'DIARISTA', paymentStatus: 'PENDING' }, // 20
      { memberType: 'MENSALISTA', paymentStatus: 'PAID' }, // 15
      { isGoalkeeper: true, paymentStatus: 'WAITING_CONFIRMATION' }, // 10
      { memberType: 'DIARISTA', paymentStatus: 'EXEMPT' }, // fora do total
    ]);

    expect(summary.totalExpected).toBe(65);
    expect(summary.totalPaid).toBe(35);
    expect(summary).toMatchObject({
      unitPrice: 20,
      goalkeeperPrice: 10,
      monthlyPrice: 15,
      paidCount: 2,
      pendingCount: 1,
      waitingCount: 1,
      exemptCount: 1,
    });
  });

  it('arredonda centavos sem erro de ponto flutuante', () => {
    const summary = summarizeFinances({ price: 0.1 }, [
      { paymentStatus: 'PAID' },
      { paymentStatus: 'PAID' },
      { paymentStatus: 'PAID' },
    ]);
    expect(summary.totalPaid).toBe(0.3);
  });

  it('pelada sem jogadores tem tudo zerado', () => {
    expect(summarizeFinances(pelada, [])).toMatchObject({ totalExpected: 0, totalPaid: 0, paidCount: 0 });
  });
});

describe('placar ao vivo', () => {
  const goal = (teamName: string, extra: Partial<LiveGoalEvent> = {}): LiveGoalEvent => ({
    id: Math.random().toString(36).slice(2),
    teamName,
    scorerId: null,
    scorerName: null,
    assistId: null,
    assistName: null,
    ownGoal: false,
    minute: null,
    createdAt: new Date().toISOString(),
    ...extra,
  });

  it('partida nova comeca 0 x 0 com cronometro parado', () => {
    const live = newLiveMatch('Azul', 'Branco');
    expect(computeLiveScore(live)).toEqual({ scoreA: 0, scoreB: 0 });
    expect(live.timer).toEqual({ running: false, startedAt: null, accumulatedMs: 0 });
  });

  it('placar e derivado dos gols, contando gol contra para o time creditado', () => {
    const live = newLiveMatch('Azul', 'Branco');
    live.events.push(goal('Azul'), goal('Branco'), goal('Azul', { ownGoal: true }), goal('Azul'));
    expect(computeLiveScore(live)).toEqual({ scoreA: 3, scoreB: 1 });
  });

  it('ignora gols de times que nao estao na partida', () => {
    const live = newLiveMatch('Azul', 'Branco');
    live.events.push(goal('Vermelho'));
    expect(computeLiveScore(live)).toEqual({ scoreA: 0, scoreB: 0 });
  });
});

describe('getTimerElapsedMs', () => {
  it('parado devolve o acumulado', () => {
    expect(getTimerElapsedMs({ running: false, startedAt: 1000, accumulatedMs: 5000 }, 99_000)).toBe(5000);
  });

  it('rodando soma o acumulado com o tempo desde o ultimo inicio', () => {
    expect(getTimerElapsedMs({ running: true, startedAt: 10_000, accumulatedMs: 60_000 }, 25_000)).toBe(75_000);
  });

  it('nunca fica negativo, mesmo com relogio adiantado', () => {
    expect(getTimerElapsedMs({ running: true, startedAt: 50_000, accumulatedMs: 0 }, 40_000)).toBe(0);
  });
});
