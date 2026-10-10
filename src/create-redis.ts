import { RedisClient } from "bun";
import tryCatch from "@vicstack/try-catch";
import type { OnError } from "./types";

const RECONNECT_INTERVAL_MS = 5_000;

// one script so the counter can't exist without an expiry; the TTL check also
// repairs keys left without one
const INCREMENT_WITH_TTL = `
local count = redis.call("INCR", KEYS[1])
if redis.call("TTL", KEYS[1]) == -1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return count
`;

const defaultOnError: OnError = (error, context) => {
  console.error(`[redis] ${context}`, error);
};

export type RedisOptions = {
  url: string;
  /** Called whenever a Redis operation fails. Defaults to `console.error`. */
  onError?: OnError;
};

export function createRedis({ url, onError = defaultOnError }: RedisOptions) {
  // no offline queue: while disconnected, commands reject right away instead of
  // waiting out the retries, so callers can fail soft without stalling the request
  const client = new RedisClient(url, {
    connectionTimeout: 2_000,
    maxRetries: 3,
    enableOfflineQueue: false,
  });

  let connected = false;
  let reconnecting = false;

  // Bun stops reconnecting once `maxRetries` is spent and never retries on
  // its own after that, so keep calling `connect()` until Redis is back.
  function scheduleReconnect() {
    if (reconnecting) return;
    reconnecting = true;
    setTimeout(async () => {
      const [, error] = await tryCatch(client.connect());
      reconnecting = false;
      if (error) scheduleReconnect();
      else connected = true;
    }, RECONNECT_INTERVAL_MS).unref();
  }

  client.onclose = (error) => {
    // `onclose` also fires on a failed initial connect, which is already
    // reported via "redis.connect" below — only report drops of a
    // connection that had actually been established
    if (connected) onError(error, "redis.close");
    connected = false;
    scheduleReconnect();
  };

  // never rejects: a failed first attempt schedules a reconnect and resolves `false`
  const ready: Promise<boolean> = tryCatch(client.connect()).then(([, error]) => {
    if (!error) {
      connected = true;
      return true;
    }
    onError(error, "redis.connect");
    scheduleReconnect();
    return false;
  });

  /** Atomically increments `key`, giving it a `ttlSec` expiry if it has none. */
  async function increment(key: string, ttlSec: number): Promise<number> {
    return client.send("EVAL", [INCREMENT_WITH_TTL, "1", key, String(ttlSec)]);
  }

  return { client, ready, increment };
}

export type Redis = ReturnType<typeof createRedis>;
