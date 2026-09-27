import { SendHorizontal, Square } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface ComposerProps {
  disabled: boolean;
  thinking: boolean;
  sending: boolean;
  onSend: (body: string) => void;
  onStop: () => void;
}

export function Composer({
  disabled,
  thinking,
  sending,
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Enter to send, Shift+Enter for a new line
        </p>
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
      </div>
    </div>
  );
}
