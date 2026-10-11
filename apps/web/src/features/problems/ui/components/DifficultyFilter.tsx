import { cn } from "cn";

import { Button } from "@/components/ui/Button";
import { DIFFICULTY_LABELS } from "@/features/problems/constants";
import type { Difficulty } from "@/features/problems/typedefs";

interface DifficultyFilterProps {
  value: Difficulty | null;
  onChange: (value: Difficulty | null) => void;
}

const OPTIONS: Array<{ value: Difficulty | null; label: string }> = [
  { value: null, label: "All" },
  { value: "easy", label: DIFFICULTY_LABELS.easy },
  { value: "medium", label: DIFFICULTY_LABELS.medium },
  { value: "hard", label: DIFFICULTY_LABELS.hard },
];

export function DifficultyFilter({ value, onChange }: DifficultyFilterProps) {
  return (
    <div
      role="group"
      aria-label="Difficulty"
      className="flex w-fit gap-1 rounded-xl border border-border bg-card p-1"
    >
      {OPTIONS.map((option) => (
        <Button
          key={option.label}
          variant="ghost"
          size="sm"
          aria-pressed={value === option.value}
          className={cn(
            "rounded-lg text-muted-foreground",
            value === option.value &&
              "bg-foreground text-background hover:bg-foreground hover:text-background",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
