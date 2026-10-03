import { cn } from "cn";

import { Button } from "@/components/ui/Button";
import type { LeaderboardPeriod } from "@/features/leaderboard/typedefs";

interface PeriodFilterProps {
  value: LeaderboardPeriod;
  onChange: (value: LeaderboardPeriod) => void;
}

const OPTIONS: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div
      role="group"
      aria-label="Period"
      className="flex w-fit gap-1 rounded-xl border border-black/[0.07] bg-white p-1"
    >
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          size="sm"
          aria-pressed={value === option.value}
          className={cn(
            "rounded-lg text-muted-foreground",
            value === option.value &&
              "bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
