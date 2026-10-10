# @vicstack/redis

Bun `RedisClient` wrapper with auto-reconnect and an atomic
increment-with-TTL primitive.

```ts
import { createRedis } from "@vicstack/redis";

const redis = createRedis({ url: env.REDIS_URL, onError? });

redis.client                  // Bun RedisClient, for anything custom
redis.ready                   // Promise<boolean>: resolves after the first connect attempt, never rejects
redis.increment(key, ttlSec)  // atomic INCR + EXPIRE in one script
```

- `onError?: (error, context) => void` defaults to `console.error` and is
  called instead of throwing whenever a Redis op fails.
- Reconnects automatically: Bun's `RedisClient` stops retrying once its own
  `maxRetries` is spent, so this keeps calling `connect()` on a 5s interval
  until the connection is back.
- No offline queue: while disconnected, commands reject right away instead
  of queuing, so callers can fail soft without stalling the caller.

See [`@vicstack/cache`](https://github.com/FranciscoAVD/cache) for a
Better-Auth `secondaryStorage` adapter and Hono rate-limit middleware built
on top of this.
