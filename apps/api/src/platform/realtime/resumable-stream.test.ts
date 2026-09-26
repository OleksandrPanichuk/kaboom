import { describe, expect, test } from "bun:test";
import z from "zod";

import type { MemoryRealtime } from "@/adapters/realtime/memory.realtime";
import { make } from "@/core/registry";

import { Realtime } from "./ports";
import { resumableStream } from "./resumable-stream";

const Event = z.object({ seq: z.number() });

type Event = z.infer<typeof Event>;

const realtime = () => make(Realtime) as MemoryRealtime;

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const open = (
  history: Event[],
  after: number | null,
  options: { maxBuffered?: number; beforeReplay?: () => Promise<void> } = {},
) => {
  const controller = new AbortController();

  const stream = resumableStream({
    channel: "room",
    schema: Event,
    after,
    position: (event) => event.seq,
    replay: async (from) => {
      await options.beforeReplay?.();

      return history.filter((event) => from === null || event.seq > from);
    },
    signal: controller.signal,
    maxBuffered: options.maxBuffered,
  });

  return { stream, controller };
};

const take = async (stream: AsyncGenerator<Event>, count: number) => {
  const seen: number[] = [];

  while (seen.length < count) {
    const result = await stream.next();

    if (result.done) break;

    seen.push(result.value.seq);
  }

  return seen;
};

describe("resumableStream", () => {
  test("replays what the client missed, then goes live", async () => {
    const { stream } = open([{ seq: 1 }, { seq: 2 }, { seq: 3 }], 1);

    const first = await take(stream, 2);

    const rest = take(stream, 1);

    await settle();
    await realtime().publish("room", { seq: 4 });

    expect(first).toEqual([2, 3]);
    expect(await rest).toEqual([4]);
  });

  test("neither loses nor repeats an event published while replaying", async () => {
    const history = [{ seq: 1 }, { seq: 2 }];

    const { stream } = open(history, null, {
      beforeReplay: async () => {
        await realtime().publish("room", { seq: 2 });
        await realtime().publish("room", { seq: 3 });
        await settle();
      },
    });

    expect(await take(stream, 3)).toEqual([1, 2, 3]);
  });

  test("unsubscribes when the client goes away", async () => {
    const { stream, controller } = open([], null);

    const pending = stream.next();

    await settle();
    expect(realtime().listenerCount("room")).toBe(1);

    controller.abort();

    expect(await pending).toEqual({ done: true, value: undefined });
    expect(realtime().listenerCount("room")).toBe(0);
  });

  test("ends rather than grow without bound when the client falls behind", async () => {
    const { stream } = open([{ seq: 1 }], null, { maxBuffered: 2 });

    expect((await stream.next()).value).toEqual({ seq: 1 });

    for (const seq of [2, 3, 4, 5]) {
      await realtime().publish("room", { seq });
    }
    await settle();

    const rest: number[] = [];

    for await (const event of stream) rest.push(event.seq);

    expect(rest).toEqual([]);
    expect(realtime().listenerCount("room")).toBe(0);
  });
});
