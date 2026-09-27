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
      className="flex w-fit gap-1 rounded-xl border border-black/[0.07] bg-white p-1"
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
