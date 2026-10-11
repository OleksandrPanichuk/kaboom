import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { StepScrubber } from "@/features/simulation";

interface ReplayBarProps {
  title: string;
  step: number;
  steps: number;
  stepSeconds: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}

export function ReplayBar({
  title,
  step,
  steps,
  stepSeconds,
  onStepChange,
  onClose,
}: ReplayBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
      <section
        aria-label={`Replay of ${title}`}
        className="pointer-events-auto flex w-full max-w-md flex-col gap-2 rounded-xl border border-interactive-border/70 bg-card py-2.5 pr-1.5 pl-3.5 shadow-card"
      >
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">Replaying </span>
            <span className="font-medium">{title}</span>
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Stop the replay"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="pr-2">
          <StepScrubber
            step={step}
            steps={steps}
            stepSeconds={stepSeconds}
            onChange={onStepChange}
          />
        </div>
      </section>
    </div>
  );
}
