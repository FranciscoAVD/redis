export type OnError = (error: Error, context: string) => void;

export type Increment = (key: string, ttlSec: number) => Promise<number>;

/** Minimal surface of Bun's `RedisClient` consumers of this package depend on. */
export type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex?: "EX", seconds?: number): Promise<unknown>;
  del(key: string): Promise<number>;
  getdel(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
};
