import { cn } from "cn";

import {
  DIFFICULTY_LABELS,
  DIFFICULTY_TONES,
} from "@/features/problems/constants";

interface DifficultyBadgeProps {
  difficulty: keyof typeof DIFFICULTY_LABELS;
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        DIFFICULTY_TONES[difficulty],
      )}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
