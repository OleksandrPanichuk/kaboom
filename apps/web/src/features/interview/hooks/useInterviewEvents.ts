import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { interviewQuery } from "@/features/interview/api";
import type { DurableEvent, LiveTurn } from "@/features/interview/typedefs";

const DURABLE = [
  "message",
  "revision",
  "phase",
  "simulation",
  "highlight",
  "status",
] as const;

interface InterviewEventsOptions {
  onLive?: (event: DurableEvent) => void;
}

export interface InterviewEvents {
  events: DurableEvent[];
  live: LiveTurn | null;
  thinking: boolean;
  connected: boolean;
}

export const useInterviewEvents = (
  id: string,
  { onLive }: InterviewEventsOptions = {},
): InterviewEvents => {
  const client = useQueryClient();
  const [events, setEvents] = useState<DurableEvent[]>([]);
  const [live, setLive] = useState<LiveTurn | null>(null);
  const [thinking, setThinking] = useState(false);
  const [connected, setConnected] = useState(false);
  const onLiveRef = useRef(onLive);
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    onLiveRef.current = onLive;
  });

  useEffect(() => {
    const source = new EventSource(`/api/interviews/${id}/events?since=0`);
    const seen = new Set<number>();

    source.addEventListener("ready", () => setConnected(true));
    source.addEventListener("error", () => setConnected(false));

    for (const type of DURABLE) {
      source.addEventListener(type, (message: MessageEvent<string>) => {
        const event = JSON.parse(message.data) as DurableEvent;

        if (seen.has(event.seq)) return;

        seen.add(event.seq);
        setEvents((current) => [...current, event]);

        if (new Date(event.at).getTime() >= openedAt - 1_000) {
          onLiveRef.current?.(event);
        }

        if (type === "message") {
          setLive((current) =>
            current && current.turnId === event.payload.turnId ? null : current,
          );
        }

        if (type === "message" || type === "phase" || type === "status") {
          void client.invalidateQueries({
            queryKey: interviewQuery(id).queryKey,
          });
        }
      });
    }

    source.addEventListener(
      "message-delta",
      (message: MessageEvent<string>) => {
        const { turnId, text } = JSON.parse(message.data) as LiveTurn;

        setLive((current) =>
          current?.turnId === turnId
            ? { turnId, text: current.text + text }
            : { turnId, text },
        );
      },
    );

    source.addEventListener("turn", (message: MessageEvent<string>) => {
      const { state, turnId } = JSON.parse(message.data) as {
        state: "thinking" | "idle";
        turnId: string;
      };

      setThinking(state === "thinking");

      if (state === "idle") {
        setLive((current) => (current?.turnId === turnId ? null : current));
      }
    });

    return () => source.close();
  }, [client, id, openedAt]);

  return { events, live, thinking, connected };
};
