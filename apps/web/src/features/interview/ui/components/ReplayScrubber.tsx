import { cn } from "cn";

import type { ReplayEntry, ReplayRevision } from "@/features/interview/utils";
import { formatDuration } from "@/features/interview/utils";

interface ReplayScrubberProps {
  offset: number;
  duration: number;
  entries: readonly ReplayEntry[];
  revisions: readonly ReplayRevision[];
  onSeek: (offset: number) => void;
}

interface Mark {
  offset: number;
  tone: string;
  label: string;
}

const marksOf = (
  entries: readonly ReplayEntry[],
  revisions: readonly ReplayRevision[],
): Mark[] => [
  ...revisions.slice(1).map((revision) => ({
    offset: revision.offset,
    tone: "bg-interactive",
    label: `Revision ${revision.number}`,
  })),
  ...entries.map((entry) =>
    entry.kind === "message"
      ? {
          offset: entry.offset,
          tone:
            entry.message.author === "user"
              ? "bg-foreground/50"
              : "bg-muted-foreground/40",
          label: entry.message.author === "user" ? "You" : "Interviewer",
        }
      : {
          offset: entry.offset,
          tone:
            entry.event.type === "simulation"
              ? "bg-warning"
              : entry.event.type === "phase"
                ? "bg-primary"
                : "bg-success",
          label:
            entry.event.type === "simulation"
              ? "Drill"
              : entry.event.type === "phase"
                ? "Phase"
                : "Pointed at the design",
        },
  ),
];

export function ReplayScrubber({
  offset,
  duration,
  entries,
  revisions,
  onSeek,
}: ReplayScrubberProps) {
  const span = Math.max(duration, 1);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-4">
        {marksOf(entries, revisions).map((mark, index) => (
          <button
            key={`${mark.offset}-${index}`}
            type="button"
            title={`${mark.label} · ${formatDuration(mark.offset)}`}
            aria-label={`${mark.label} at ${formatDuration(mark.offset)}`}
            onClick={() => onSeek(mark.offset)}
            className={cn(
              "absolute top-1 h-3 w-1 -translate-x-1/2 rounded-full opacity-80 hover:opacity-100",
              mark.tone,
            )}
            style={{ left: `${(mark.offset / span) * 100}%` }}
          />
        ))}
      </div>
      <input
        type="range"
        aria-label="Position in the interview"
        min={0}
        max={span}
        step={1000}
        value={Math.min(offset, span)}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
