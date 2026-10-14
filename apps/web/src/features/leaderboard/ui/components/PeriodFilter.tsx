import { SegmentedControl } from "@/components/SegmentedControl";
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
    <SegmentedControl
      name="period"
      label="Period"
      value={value}
      options={OPTIONS}
      onChange={(next) =>
        onChange(OPTIONS.find((option) => option.value === next)!.value)
      }
    />
  );
}
