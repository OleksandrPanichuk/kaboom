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
