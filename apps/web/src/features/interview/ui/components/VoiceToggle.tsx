import { Link } from "@tanstack/react-router";
import { Lock, Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface VoiceToggleProps {
  allowed: boolean;
  active: boolean;
  onToggle: () => void;
}

export function VoiceToggle({ allowed, active, onToggle }: VoiceToggleProps) {
  if (!allowed) {
    return (
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 rounded text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Lock aria-hidden="true" className="size-3.5" />
        Talk to the interviewer: Pro
      </Link>
    );
  }

  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      aria-pressed={active}
      onClick={onToggle}
    >
      {active ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
      {active ? "Voice on" : "Voice"}
    </Button>
  );
}
