import { afterEach, describe, expect, test } from "bun:test";
import z from "zod";

import { RedisRealtime } from "@/adapters/realtime/redis.realtime";
import { getEnv } from "@/configs";
import { createOwnedRedisConnection } from "@/infrastructure/redis";

const url = process.env.TEST_CACHE_REDIS_URL;

const PREFIX = `${getEnv().APP_SLUG}:test:realtime:`;

const Message = z.object({ seq: z.number() });

const instances: RedisRealtime[] = [];
const publishers: Array<ReturnType<typeof createOwnedRedisConnection>> = [];

const instance = (prefix = PREFIX): RedisRealtime => {
  const publisher = createOwnedRedisConnection({ name: "test-pub", url });
  const subscriber = createOwnedRedisConnection({ name: "test-sub", url });
  const realtime = new RedisRealtime(publisher, subscriber, prefix);

  publishers.push(publisher);
  instances.push(realtime);

  return realtime;
};

const eventually = async (check: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (check()) return;

    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

afterEach(async () => {
  await Promise.all(instances.splice(0).map((realtime) => realtime.close()));
  await Promise.all(publishers.splice(0).map((publisher) => publisher.close()));
});

describe.skipIf(!url)("RedisRealtime against a real Redis", () => {
  test("delivers a message from one instance to another", async () => {
    const sender = instance();
    const receiver = instance();
    const received: unknown[] = [];

    await sender.verify();
    await receiver.verify();
    await receiver.subscribe("room", Message, (message) => {
      received.push(message);
    });

    await sender.publish("room", { seq: 1 });
    await eventually(() => received.length === 1);

    expect(received).toEqual([{ seq: 1 }]);
  });

  test("keeps the channel while another listener remains", async () => {
    const realtime = instance();
    const first: unknown[] = [];
    const second: unknown[] = [];

    await realtime.verify();

    const unsubscribeFirst = await realtime.subscribe("room", Message, (m) => {
      first.push(m);
    });
    await realtime.subscribe("room", Message, (m) => {
      second.push(m);
    });

    await unsubscribeFirst();
    await realtime.publish("room", { seq: 1 });
    await eventually(() => second.length === 1);

    expect(first).toEqual([]);
    expect(second).toEqual([{ seq: 1 }]);
  });

  test("unsubscribes from Redis when the last listener leaves", async () => {
    const realtime = instance();
    const observer = createOwnedRedisConnection({ name: "test-observer", url });

    publishers.push(observer);
    await realtime.verify();

    const unsubscribe = await realtime.subscribe(
      "room",
      Message,
      () => undefined,
    );
    const client = await observer.connect();

    expect(await client.pubsub("NUMSUB", `${PREFIX}room`)).toEqual([
      `${PREFIX}room`,
      1,
    ]);

    await unsubscribe();

    expect(await client.pubsub("NUMSUB", `${PREFIX}room`)).toEqual([
      `${PREFIX}room`,
      0,
    ]);
  });

  test("drops a malformed message and keeps delivering", async () => {
    const realtime = instance();
    const raw = createOwnedRedisConnection({ name: "test-raw", url });
    const received: unknown[] = [];

    publishers.push(raw);
    await realtime.verify();
    await realtime.subscribe("room", Message, (message) => {
      received.push(message);
    });

    const client = await raw.connect();

    await client.publish(`${PREFIX}room`, "not json");
    await client.publish(`${PREFIX}room`, JSON.stringify({ seq: "x" }));
    await realtime.publish("room", { seq: 2 });
    await eventually(() => received.length === 1);

    expect(received).toEqual([{ seq: 2 }]);
  });

  test("keeps apps with different prefixes apart", async () => {
    const ours = instance();
    const theirs = instance(`${PREFIX}other:`);
    const received: unknown[] = [];

    await ours.verify();
    await theirs.verify();
    await ours.subscribe("room", Message, (message) => {
      received.push(message);
    });

    await theirs.publish("room", { seq: 1 });
    await ours.publish("room", { seq: 2 });
    await eventually(() => received.length === 1);

    expect(received).toEqual([{ seq: 2 }]);
  });
});
