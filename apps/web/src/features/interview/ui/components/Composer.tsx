import { SendHorizontal, Square } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

const HINT = "Enter to send, Shift+Enter for a new line";

interface ComposerProps {
  disabled: boolean;
  thinking: boolean;
  sending: boolean;
  voiceToggle?: ReactNode;
  voiceStatus?: ReactNode;
  onSend: (body: string) => void;
  onStop: () => void;
}

export function Composer({
  disabled,
  thinking,
  sending,
  voiceToggle,
  voiceStatus,
  onSend,
  onStop,
}: ComposerProps) {
  const id = useId();
  const [body, setBody] = useState("");
  const send = () => {
    const text = body.trim();

    if (!text || disabled) return;

    onSend(text);
    setBody("");
  };

  return (
    <div className="flex flex-col gap-2 border-t bg-background p-3">
      {voiceStatus}
      <label htmlFor={id} className="sr-only">
        Message the interviewer
      </label>
      <Textarea
        id={id}
        rows={2}
        maxLength={4_000}
        value={body}
        disabled={disabled}
        placeholder={
          disabled
            ? "The interview has ended."
            : "Ask a question or explain your design…"
        }
        className="min-h-16 resize-none"
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        {voiceToggle ?? (
          <p className="min-w-0 text-xs text-muted-foreground">{HINT}</p>
        )}
        {thinking ? (
          <Button variant="outline" size="sm" onClick={onStop}>
            <Square aria-hidden="true" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={disabled || sending || body.trim() === ""}
            onClick={send}
          >
            <SendHorizontal aria-hidden="true" />
            Send
          </Button>
        )}
        {voiceToggle ? (
          <p className="basis-full text-xs text-muted-foreground">{HINT}</p>
        ) : null}
      </div>
    </div>
  );
}
