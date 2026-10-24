import type { InterviewModel } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { entitlementsQuery } from "@/features/billing";
import { useVoiceMode } from "@/features/interview/hooks";
import type { DurableEvent, LiveTurn } from "@/features/interview/typedefs";
import { voiceSupport } from "@/features/interview/utils";

import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { TimelineCard } from "./TimelineCard";
import { VoiceStatus } from "./VoiceStatus";
import { VoiceToggle } from "./VoiceToggle";

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
  const { data: plan } = useQuery(entitlementsQuery);
  const [support] = useState(() => voiceSupport(window as never));
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const running = interview.status === "active";
  const replies = useMemo(
    () =>
      interview.messages
        .filter((message) => message.author === "interviewer")
        .map((message) => ({ id: message.id, text: message.body })),
    [interview.messages],
  );
  const voice = useVoiceMode({
    active: voiceOn && running,
    canListen: running && !thinking && !sending,
    replies,
    onUtterance: onSend,
    onProblem: (note) => {
      setVoiceOn(false);
      setVoiceNote(note);
    },
  });
  const voiceAvailable = support.listen && support.speak && plan !== undefined;
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
        voiceToggle={
          voiceAvailable && running ? (
            <VoiceToggle
              allowed={plan.voice}
              active={voiceOn}
              onToggle={() => {
                setVoiceNote(null);
                setVoiceOn((current) => !current);
              }}
            />
          ) : null
        }
        voiceStatus={
          <VoiceStatus
            active={voiceOn && running}
            listening={voice.listening}
            speaking={voice.speaking}
            caption={voice.caption}
            note={voiceNote}
            onSkip={voice.skip}
          />
        }
        onSend={onSend}
        onStop={onStop}
      />
    </div>
  );
}
