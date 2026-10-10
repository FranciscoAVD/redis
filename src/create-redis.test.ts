import { describe, expect, test } from "bun:test";
import { createRedis } from "./create-redis";

describe("createRedis", () => {
  test("ready resolves to false without throwing when Redis is unreachable", async () => {
    const errors: string[] = [];
    const { ready } = createRedis({
      url: "redis://127.0.0.1:1",
      onError: (_error, context) => errors.push(context),
    });

    expect(await ready).toBe(false);
    expect(errors).toContain("redis.connect");
  });

  test("exposes a client and an increment function", () => {
    const { client, increment } = createRedis({ url: "redis://127.0.0.1:1" });
    expect(typeof client.get).toBe("function");
    expect(typeof increment).toBe("function");
  });
});
