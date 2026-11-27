// Cache curtissimo, em memoria, da versao de sincronizacao de cada pelada.
//
// Todo mundo com a tela da pelada aberta consulta /peladas/:id/sync a cada poucos
// segundos. Na Vercel, uma mesma instancia aquecida atende varias dessas consultas;
// com este cache, so a primeira dentro da janela vai ao banco e as outras reutilizam
// a resposta. Qualquer alteracao feita por esta instancia apaga a entrada na hora; uma
// alteracao feita por outra instancia aparece, no maximo, `ttlMs` depois.

export interface SyncCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export class SyncCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();
  private pending = new Map<string, Promise<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: SyncCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 1500;
    this.maxEntries = options.maxEntries ?? 500;
    this.now = options.now ?? Date.now;
  }

  /** Devolve do cache ou carrega; consultas simultaneas da mesma chave compartilham a carga. */
  async get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.value;

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const promise = load()
      .then((value) => {
        // so guarda se ninguem invalidou durante a carga
        if (this.pending.get(key) === promise) {
          this.set(key, value);
        }
        return value;
      })
      .finally(() => {
        if (this.pending.get(key) === promise) this.pending.delete(key);
      });
    this.pending.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.entries.delete(key);
    this.pending.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }

  private set(key: string, value: T): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      // descarta a entrada mais antiga (Map mantem a ordem de insercao)
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }
}

/** Cache compartilhado da versao de sincronizacao das peladas (por id). */
export const peladaSyncCache = new SyncCache<{ syncVersion: string; status: string }>();
