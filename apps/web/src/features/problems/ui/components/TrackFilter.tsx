import { type Track, TRACK_LABELS, TRACKS } from "@repo/design";

import { SegmentedControl } from "@/components/SegmentedControl";

interface TrackFilterProps {
  value: Track | null;
  onChange: (value: Track | null) => void;
}

const ALL = "all";

const OPTIONS = [
  { value: ALL, label: "All tracks" },
  ...TRACKS.map((track) => ({ value: track, label: TRACK_LABELS[track] })),
];

export function TrackFilter({ value, onChange }: TrackFilterProps) {
  return (
    <SegmentedControl
      name="track"
      label="Track"
      value={value ?? ALL}
      options={OPTIONS}
      onChange={(next) =>
        onChange(next === ALL ? null : TRACKS.find((track) => track === next)!)
      }
    />
  );
}
