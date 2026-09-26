import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";
import { Elysia, t } from "elysia";
import z from "zod";

import type { MemoryRealtime } from "@/adapters/realtime/memory.realtime";
import { ForbiddenError } from "@/core/errors";
import { make } from "@/core/registry";
import { defineStreamRoute } from "@/core/stream-route";
import { sessionsPlugin } from "@/modules/sessions";
import { rateLimitPlugin } from "@/platform/rate-limit";
import {
  Realtime,
  RealtimeUnavailableError,
  resumableStream,
} from "@/platform/realtime";
import { errorPlugin } from "@/plugins";

const Note = z.object({ seq: z.number(), text: z.string() });

type Note = z.infer<typeof Note>;

const HISTORY: Note[] = [
  { seq: 1, text: "one" },
  { seq: 2, text: "two" },
];

const realtime = () => make(Realtime) as MemoryRealtime;

const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const probe = new Elysia()
  .use(errorPlugin)
  .use(sessionsPlugin)
  .use(rateLimitPlugin)
  .get(
    "/rooms/:room/events",
    ...defineStreamRoute({
      params: t.Object({ room: t.String() }),
      query: t.Object({ since: t.Optional(t.Integer({ minimum: 0 })) }),
      auth: true,
      heartbeatMs: 50,
      guards: [
        ({ params }) => {
          if (params.room === "private") throw new ForbiddenError("Not yours");
        },
      ],
      stream: async function* ({ params, query, lastEventId, signal }) {
        if (params.room === "down") throw new RealtimeUnavailableError();

        const after =
          lastEventId !== null ? Number(lastEventId) : (query.since ?? null);

        for await (const note of resumableStream({
          channel: `rooms:${params.room}`,
          schema: Note,
          after,
          position: (message) => message.seq,
          replay: (from) =>
            Promise.resolve(
              HISTORY.filter((note) => from === null || note.seq > from),
            ),
          signal,
        })) {
          yield { id: note.seq, event: "note", data: note };
        }
      },
    }),
  );

interface ParsedEvent {
  id?: string;
  event?: string;
  data?: string;
}

const connect = async (path: string, headers: Record<string, string> = {}) => {
  const controller = new AbortController();
  const response = await probe.handle(
    new Request(`http://localhost${path}`, {
      headers,
      signal: controller.signal,
    }),
  );

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const next = async (): Promise<ParsedEvent> => {
    while (!buffer.includes("\n\n")) {
      const chunk = await reader!.read();

      if (chunk.done) throw new Error("stream ended");

      const value: unknown = chunk.value;

      buffer +=
        typeof value === "string"
          ? value
          : decoder.decode(value as Uint8Array, { stream: true });
    }

    const end = buffer.indexOf("\n\n");
    const block = buffer.slice(0, end);

    buffer = buffer.slice(end + 2);

    return Object.fromEntries(
      block.split("\n").map((line) => {
        const colon = line.indexOf(":");

        return [line.slice(0, colon), line.slice(colon + 1).trimStart()];
      }),
    );
  };

  const nextNote = async (): Promise<ParsedEvent> => {
    const event = await next();

    return event.event === "heartbeat" ? nextNote() : event;
  };

  const close = async () => {
    controller.abort();
    await reader?.cancel().catch(() => undefined);
    await settle(10);
  };

  return { response, next, nextNote, close };
};

describe("defineStreamRoute", () => {
  test("refuses a guest before opening a stream", async () => {
    const { response } = await connect("/rooms/lobby/events");

    expect(response.status).toBe(401);
  });

  test("answers a guard's refusal with its own status", async () => {
    const user = await createUser();
    const { response } = await connect("/rooms/private/events", {
      cookie: user.cookies(),
    });

    expect(response.status).toBe(403);
  });

  test("answers an error raised before the first event with its status", async () => {
    const user = await createUser();
    const { response } = await connect("/rooms/down/events", {
      cookie: user.cookies(),
    });

    expect(response.status).toBe(503);
  });

  test("streams the history, then live events, as server-sent events", async () => {
    const user = await createUser();
    const stream = await connect("/rooms/lobby/events", {
      cookie: user.cookies(),
    });

    expect(stream.response.status).toBe(200);
    expect(stream.response.headers.get("content-type")).toContain(
      "text/event-stream",
    );

    expect(await stream.nextNote()).toEqual({
      id: "1",
      event: "note",
      data: JSON.stringify({ seq: 1, text: "one" }),
    });
    expect((await stream.nextNote()).id).toBe("2");

    await realtime().publish("rooms:lobby", { seq: 3, text: "three" });

    expect(await stream.nextNote()).toEqual({
      id: "3",
      event: "note",
      data: JSON.stringify({ seq: 3, text: "three" }),
    });

    await stream.close();
  });

  test("resumes after the Last-Event-ID a reconnecting browser sends", async () => {
    const user = await createUser();
    const stream = await connect("/rooms/lobby/events", {
      cookie: user.cookies(),
      "last-event-id": "1",
    });

    expect((await stream.nextNote()).id).toBe("2");

    await stream.close();
  });

  test("resumes after ?since= on a first connection", async () => {
    const user = await createUser();
    const stream = await connect("/rooms/lobby/events?since=2", {
      cookie: user.cookies(),
    });

    await realtime().publish("rooms:lobby", { seq: 3, text: "three" });

    expect((await stream.nextNote()).id).toBe("3");

    await stream.close();
  });

  test("sends a heartbeat while nothing happens", async () => {
    const user = await createUser();
    const stream = await connect("/rooms/lobby/events?since=2", {
      cookie: user.cookies(),
    });

    expect((await stream.next()).event).toBe("heartbeat");

    await stream.close();
  });

  test("unsubscribes once the client disconnects", async () => {
    const user = await createUser();
    const stream = await connect("/rooms/lobby/events", {
      cookie: user.cookies(),
    });

    await stream.nextNote();
    expect(realtime().listenerCount("rooms:lobby")).toBe(1);

    await stream.close();

    expect(realtime().listenerCount("rooms:lobby")).toBe(0);
  });

  test("unsubscribes when a real socket closes", async () => {
    const user = await createUser();
    const server = probe.listen(0);
    const controller = new AbortController();

    try {
      const response = await fetch(
        `http://localhost:${server.server!.port}/rooms/lobby/events`,
        { headers: { cookie: user.cookies() }, signal: controller.signal },
      );
      const reader = response.body!.getReader();

      await reader.read();
      expect(realtime().listenerCount("rooms:lobby")).toBe(1);

      controller.abort();
      await settle(100);

      expect(realtime().listenerCount("rooms:lobby")).toBe(0);
    } finally {
      await server.stop(true);
    }
  });

  test("applies the route's rate limit before opening a stream", async () => {
    const limited = new Elysia()
      .use(errorPlugin)
      .use(sessionsPlugin)
      .use(rateLimitPlugin)
      .get(
        "/limited",
        ...defineStreamRoute({
          auth: true,
          rateLimit: { limit: 1, windowMs: 60_000, scope: "probe:stream" },
          stream: async function* () {
            yield await Promise.resolve({ data: "hello" });
          },
        }),
      );
    const user = await createUser();
    const open = () =>
      limited.handle(
        new Request("http://localhost/limited", {
          headers: { cookie: user.cookies() },
        }),
      );

    expect((await open()).status).toBe(200);
    expect((await open()).status).toBe(429);
  });
});
