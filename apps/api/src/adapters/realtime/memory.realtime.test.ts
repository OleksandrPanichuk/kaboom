import { describe, expect, test } from "bun:test";
import z from "zod";

import { MemoryRealtime } from "./memory.realtime";

const Message = z.object({ seq: z.number(), at: z.string() });

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("MemoryRealtime", () => {
  test("delivers what a real transport would: JSON, checked by the schema", async () => {
    const realtime = new MemoryRealtime();
    const received: unknown[] = [];

    await realtime.subscribe("room", Message, (message) => {
      received.push(message);
    });

    await realtime.publish("room", {
      seq: 1,
      at: new Date("2026-01-01T00:00:00Z"),
    });
    await realtime.publish("room", { seq: "not a number" });
    await realtime.publish("other", { seq: 2, at: "x" });
    await settle();

    expect(received).toEqual([{ seq: 1, at: "2026-01-01T00:00:00.000Z" }]);
  });

  test("stops delivering after unsubscribe and forgets the channel", async () => {
    const realtime = new MemoryRealtime();
    const received: unknown[] = [];

    const unsubscribe = await realtime.subscribe("room", Message, (message) => {
      received.push(message);
    });

    await unsubscribe();
    await realtime.publish("room", { seq: 1, at: "x" });
    await settle();

    expect(received).toEqual([]);
    expect(realtime.listenerCount()).toBe(0);
  });
});
