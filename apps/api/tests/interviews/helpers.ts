import { getApp, type TestClient } from "@tests/helpers";

export const PATH = "/api/interviews";

export interface InterviewBody {
  id: string;
  designId: string;
  problemVersion: number;
  status: string;
  phase: string;
  lastSeq: number;
  finalRevision: number | null;
  endedAt: string | null;
  problem: {
    slug: string;
    title: string;
    phases: Array<{ id: string; minutes: number; goal: string }>;
  };
  messages: Array<{ id: string; author: string; body: string }>;
}

export interface StreamedEvent {
  id: string;
  event: string;
  data: {
    seq: number;
    type: string;
    payload: Record<string, unknown>;
    turnId?: string;
    text?: string;
    state?: string;
  };
}

export const startInterview = async (
  user: TestClient,
  slug = "url-shortener",
) => (await user.post<InterviewBody>(PATH, { slug })).body;

export const openEvents = async (
  user: TestClient,
  id: string,
  { since, lastEventId }: { since?: number; lastEventId?: number } = {},
) => {
  const controller = new AbortController();
  const query = since === undefined ? "" : `?since=${since}`;
  const response = await getApp().handle(
    new Request(`http://localhost${PATH}/${id}/events${query}`, {
      headers: {
        cookie: user.cookies(),
        ...(lastEventId === undefined
          ? {}
          : { "last-event-id": String(lastEventId) }),
      },
      signal: controller.signal,
    }),
  );
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const nextBlock = async (): Promise<Record<string, string>> => {
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

  const next = async (): Promise<StreamedEvent> => {
    for (;;) {
      const block = await nextBlock();

      if (
        block.data &&
        block.event !== "heartbeat" &&
        block.event !== "ready"
      ) {
        return {
          id: block.id ?? "",
          event: block.event ?? "",
          data: JSON.parse(block.data) as StreamedEvent["data"],
        };
      }
    }
  };

  const nextDurable = async (): Promise<StreamedEvent> => {
    for (;;) {
      const event = await next();

      if (event.id) return event;
    }
  };

  return {
    status: response.status,
    next,
    nextDurable,
    close: () => controller.abort(),
  };
};
