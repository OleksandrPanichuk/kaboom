import type { InterviewModel } from "@repo/api-client";
import { useEffect, useRef } from "react";

import type { DurableEvent, LiveTurn } from "@/features/interview/typedefs";

import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { TimelineCard } from "./TimelineCard";

interface InterviewChatProps {
  interview: InterviewModel;
  events: DurableEvent[];
  live: LiveTurn | null;
  thinking: boolean;
  sending: boolean;
  error: string | null;
  onSend: (body: string) => void;
  onStop: () => void;
}

type Item =
  | { kind: "message"; at: number; message: InterviewModel["messages"][number] }
  | { kind: "event"; at: number; event: DurableEvent };

const CARDS = new Set(["phase", "simulation", "highlight", "status"]);

export function InterviewChat({
  interview,
  events,
  live,
  thinking,
  sending,
  error,
  onSend,
  onStop,
}: InterviewChatProps) {
  const end = useRef<HTMLDivElement>(null);
  const items: Item[] = [
    ...interview.messages.map((message) => ({
      kind: "message" as const,
      at: new Date(message.createdAt).getTime(),
      message,
    })),
    ...events
      .filter((event) => CARDS.has(event.type))
      .map((event) => ({
        kind: "event" as const,
        at: new Date(event.at).getTime(),
        event,
      })),
  ].sort((a, b) => a.at - b.at);
  const streaming =
    live &&
    !interview.messages.some((message) => message.turnId === live.turnId);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [items.length, live?.text]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ol
        aria-label="Conversation"
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
      >
        {items.map((item) =>
          item.kind === "message" ? (
            <MessageBubble
              key={item.message.id}
              author={item.message.author}
              body={item.message.body}
              interrupted={item.message.interrupted}
            />
          ) : (
            <TimelineCard key={`event-${item.event.seq}`} event={item.event} />
          ),
        )}
        {streaming ? (
          <MessageBubble author="interviewer" body={live.text} streaming />
        ) : thinking ? (
          <li className="self-start px-1 text-xs text-muted-foreground">
            The interviewer is thinking…
          </li>
        ) : null}
        <div ref={end} />
      </ol>
      {error ? (
        <p role="alert" className="border-t px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Composer
        disabled={interview.status !== "active"}
        thinking={thinking}
        sending={sending}
        onSend={onSend}
        onStop={onStop}
      />
    </div>
  );
}
