import { describe, expect, it, vi } from 'vitest';
import { SyncCache } from '../syncCache';

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('SyncCache', () => {
  it('reaproveita a resposta dentro da janela e volta ao banco depois', async () => {
    const c = clock();
    const cache = new SyncCache<string>({ ttlMs: 1000, now: c.now });
    const load = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

    expect(await cache.get('p1', load)).toBe('v1');
    c.advance(999);
    expect(await cache.get('p1', load)).toBe('v1');
    expect(load).toHaveBeenCalledTimes(1);

    c.advance(1);
    expect(await cache.get('p1', load)).toBe('v2');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('consultas simultaneas fazem uma unica ida ao banco', async () => {
    const cache = new SyncCache<string>();
    let resolve!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const all = Promise.all([cache.get('p1', load), cache.get('p1', load), cache.get('p1', load)]);
    resolve('v1');
    expect(await all).toEqual(['v1', 'v1', 'v1']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('invalidar faz a proxima consulta buscar a versao nova', async () => {
    const cache = new SyncCache<string>({ ttlMs: 60_000 });
    const load = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

    await cache.get('p1', load);
    cache.invalidate('p1');
    expect(await cache.get('p1', load)).toBe('v2');
  });

  it('nao guarda uma resposta que foi invalidada enquanto carregava', async () => {
    const cache = new SyncCache<string>({ ttlMs: 60_000 });
    let resolve!: (v: string) => void;
    const slow = () => new Promise<string>((r) => (resolve = r));

    const first = cache.get('p1', slow);
    cache.invalidate('p1'); // alguem alterou a pelada no meio da consulta
    resolve('antiga');
    await first;

    expect(await cache.get('p1', async () => 'nova')).toBe('nova');
  });

  it('erros nao ficam em cache', async () => {
    const cache = new SyncCache<string>();
    await expect(cache.get('p1', () => Promise.reject(new Error('rede')))).rejects.toThrow('rede');
    expect(await cache.get('p1', async () => 'ok')).toBe('ok');
  });

  it('chaves diferentes nao se misturam e o tamanho e limitado', async () => {
    const cache = new SyncCache<string>({ maxEntries: 2 });
    await cache.get('a', async () => 'A');
    await cache.get('b', async () => 'B');
    await cache.get('c', async () => 'C');
    expect(cache.size).toBe(2);
    expect(await cache.get('c', async () => 'x')).toBe('C');
    expect(await cache.get('a', async () => 'A2')).toBe('A2');
  });
});
