// Descricao dos valores da pelada (avulso, goleiro, mensalista)
import { formatBRL } from './masks';

type PricedPelada = {
  price?: number | null;
  priceGoalkeeper?: number | null;
  priceMonthly?: number | null;
  goalkeepersExempt?: boolean;
};

export function getGoalkeeperPrice(p: PricedPelada): number {
  if (p.priceGoalkeeper !== null && p.priceGoalkeeper !== undefined) return p.priceGoalkeeper;
  return p.goalkeepersExempt ? 0 : p.price || 0;
}

export function hasAnyPrice(p: PricedPelada): boolean {
  return (p.price || 0) > 0 || getGoalkeeperPrice(p) > 0 || (p.priceMonthly || 0) > 0;
}

/** "Avulso R$ 15,00 • Goleiro grátis • Mensalista R$ 60,00" ou "Gratuita" */
export function describePrices(p: PricedPelada, separator = ' • '): string {
  if (!hasAnyPrice(p)) return 'Gratuita';
  const avulso = p.price || 0;
  const gk = getGoalkeeperPrice(p);
  const parts = [
    `Avulso ${avulso > 0 ? formatBRL(avulso) : 'grátis'}`,
    `Goleiro ${gk > 0 ? formatBRL(gk) : 'grátis'}`,
  ];
  if (p.priceMonthly !== null && p.priceMonthly !== undefined) {
    parts.push(`Mensalista ${p.priceMonthly > 0 ? formatBRL(p.priceMonthly) : 'grátis'}`);
  }
  return parts.join(separator);
}

/** Valor principal para listas (cards do feed/explorar). */
export function formatMainPrice(p: PricedPelada): string {
  if (!hasAnyPrice(p)) return 'Gratuita';
  return (p.price || 0) > 0 ? formatBRL(p.price) : describePrices(p);
}
