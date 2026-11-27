import { describe, expect, it } from 'vitest';
import { nextSyncDelay } from '../syncBackoff';

describe('nextSyncDelay', () => {
  it('volta ao intervalo rapido quando algo mudou', () => {
    expect(nextSyncDelay(12000, 3000, 15000, true)).toBe(3000);
  });

  it('cresce aos poucos quando nada muda, ate o maximo', () => {
    const seq: number[] = [];
    let d = 3000;
    for (let i = 0; i < 8; i++) {
      d = nextSyncDelay(d, 3000, 15000, false);
      seq.push(d);
    }
    expect(seq.slice(0, 3)).toEqual([4500, 6750, 10125]);
    expect(seq.at(-1)).toBe(15000);
    expect(Math.max(...seq)).toBe(15000);
  });

  it('nunca fica abaixo do intervalo rapido, nem com maximo mal configurado', () => {
    expect(nextSyncDelay(100, 2000, 10000, false)).toBe(2000);
    expect(nextSyncDelay(2000, 2000, 1000, false)).toBe(2000);
  });

  it('respeita um maximo menor aplicado depois (ex.: cronometro comecou a rodar)', () => {
    expect(nextSyncDelay(10000, 2000, 4000, false)).toBe(4000);
  });
});
