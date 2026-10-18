import { useEffect, useRef } from "react";

import type { ReplayEntry } from "@/features/interview/utils";

import { MessageBubble } from "./MessageBubble";
import { TimelineCard } from "./TimelineCard";

interface ReplayTranscriptProps {
  entries: readonly ReplayEntry[];
}

export function ReplayTranscript({ entries }: ReplayTranscriptProps) {
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  return (
    <ol
      aria-label="Conversation so far"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
    >
      {entries.length === 0 ? (
        <li className="self-center py-6 text-sm text-muted-foreground">
          Nothing was said yet.
        </li>
      ) : null}
      {entries.map((entry) =>
        entry.kind === "message" ? (
          <MessageBubble
            key={entry.message.id}
            author={entry.message.author}
            body={entry.message.body}
            interrupted={entry.message.interrupted}
          />
        ) : (
          <TimelineCard key={`event-${entry.event.seq}`} event={entry.event} />
        ),
      )}
      <div ref={end} />
    </ol>
  );
}
