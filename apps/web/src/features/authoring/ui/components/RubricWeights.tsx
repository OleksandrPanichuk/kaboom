import { cn } from "cn";

interface RubricWeightsProps {
  total: number;
}

export function RubricWeights({ total }: RubricWeightsProps) {
  const exact = total === 100;

  return (
    <div className="mr-2 flex items-center gap-2">
      <div
        role="meter"
        aria-label="Rubric weights"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={total}
        aria-valuetext={`${total} of 100 points`}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full",
            exact
              ? "bg-success"
              : total > 100
                ? "bg-destructive"
                : "bg-warning",
          )}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          exact ? "text-success-foreground" : "text-warning-foreground",
        )}
      >
        {total} / 100
      </span>
    </div>
  );
}
