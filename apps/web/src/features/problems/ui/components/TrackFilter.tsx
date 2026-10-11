import { type Track, TRACK_LABELS, TRACKS } from "@repo/design";
import { cn } from "cn";

import { Button } from "@/components/ui/Button";

interface TrackFilterProps {
  value: Track | null;
  onChange: (value: Track | null) => void;
}

const OPTIONS: Array<{ value: Track | null; label: string }> = [
  { value: null, label: "All tracks" },
  ...TRACKS.map((track) => ({ value: track, label: TRACK_LABELS[track] })),
];

export function TrackFilter({ value, onChange }: TrackFilterProps) {
  return (
    <div
      role="group"
      aria-label="Track"
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-border bg-card p-1"
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
