import { SegmentedControl } from "@/components/SegmentedControl";
import { DIFFICULTY_LABELS } from "@/features/problems/constants";
import type { Difficulty } from "@/features/problems/typedefs";

interface DifficultyFilterProps {
  value: Difficulty | null;
  onChange: (value: Difficulty | null) => void;
}

const ALL = "all";
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const OPTIONS = [
  { value: ALL, label: "Any level" },
  ...DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] })),
];

export function DifficultyFilter({ value, onChange }: DifficultyFilterProps) {
  return (
    <SegmentedControl
      name="difficulty"
      label="Difficulty"
      value={value ?? ALL}
      options={OPTIONS}
      onChange={(next) =>
        onChange(DIFFICULTIES.find((item) => item === next) ?? null)
      }
    />
  );
}
