import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { progressQuery, scoreTone } from "@/features/problems";
import { activityQuery } from "@/features/progress/api";

const SOLVED_SCORE = 80;

interface TileProps {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}

function Tile({ label, value, detail, tone }: TileProps) {
  return (
    <li className="flex min-w-0 flex-col gap-1 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)]">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-semibold tracking-[-0.04em]", tone)}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground text-pretty">{detail}</p>
    </li>
  );
}

export function ProgressSummary() {
  const { data: progress } = useSuspenseQuery(progressQuery);
  const { data: activity } = useSuspenseQuery(activityQuery);
  const { interviewsReviewed, averageInterviewScore } = activity.totals;
  const solved = progress.problems.filter(
    (problem) => problem.bestScore >= SOLVED_SCORE,
  ).length;

  return (
    <ul aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Points"
        value={progress.points.toLocaleString("en")}
        detail={`Rank ${progress.rank.name}`}
      />
      <Tile
        label="Interviews reviewed"
        value={String(interviewsReviewed)}
        detail={
          interviewsReviewed === 0 ? "None yet" : "Every one you finished"
        }
      />
      <Tile
        label="Average interview score"
        value={
          averageInterviewScore === null ? "–" : String(averageInterviewScore)
        }
        detail="Out of 100, across every review"
        tone={
          averageInterviewScore === null
            ? "text-muted-foreground"
            : scoreTone(averageInterviewScore)
        }
      />
      <Tile
        label="Challenges solved"
        value={String(solved)}
        detail={`Scored ${SOLVED_SCORE} or more, of ${progress.problems.length} attempted`}
      />
    </ul>
  );
}
