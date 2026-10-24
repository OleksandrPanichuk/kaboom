import { Mic, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface VoiceStatusProps {
  active: boolean;
  listening: boolean;
  speaking: boolean;
  caption: string;
  note: string | null;
  onSkip: () => void;
}

export function VoiceStatus({
  active,
  listening,
  speaking,
  caption,
  note,
  onSkip,
}: VoiceStatusProps) {
  if (note && !active) {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        {note}
      </p>
    );
  }

  if (!active) return null;

  return (
    <div
      role="status"
      className="flex min-h-8 items-center justify-between gap-2 rounded-lg border border-interactive-border/60 bg-interactive-surface px-3 py-1.5 text-sm text-interactive-foreground"
    >
      {speaking ? (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <Volume2 aria-hidden="true" className="size-4 shrink-0" />
            The interviewer is speaking…
          </span>
          <Button variant="ghost" size="xs" onClick={onSkip}>
            Skip
          </Button>
        </>
      ) : (
        <span className="flex min-w-0 items-center gap-2">
          <Mic
            aria-hidden="true"
            className={
              listening ? "size-4 shrink-0 animate-pulse" : "size-4 shrink-0"
            }
          />
          <span className="min-w-0 truncate">
            {caption ||
              (listening ? "Listening, just talk…" : "Waiting for your turn…")}
          </span>
        </span>
      )}
    </div>
  );
}
