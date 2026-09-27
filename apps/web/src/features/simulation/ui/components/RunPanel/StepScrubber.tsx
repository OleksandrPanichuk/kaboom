import { Slider } from "@/components/ui/Slider";
import { formatClock } from "@/features/simulation/utils";

interface StepScrubberProps {
  step: number;
  steps: number;
  stepSeconds: number;
  onChange: (step: number) => void;
}

export function StepScrubber({
  step,
  steps,
  stepSeconds,
  onChange,
}: StepScrubberProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium tabular-nums">
          {formatClock(step * stepSeconds)}
        </span>
        <span className="text-muted-foreground tabular-nums">
          of {formatClock(steps * stepSeconds)}
        </span>
      </div>
      <Slider
        aria-label="Time in the run"
        min={0}
        max={Math.max(0, steps - 1)}
        step={1}
        value={[step]}
        onValueChange={(value) =>
          onChange(typeof value === "number" ? value : (value[0] ?? 0))
        }
      />
    </div>
  );
}
