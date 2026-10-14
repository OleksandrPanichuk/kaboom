import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { progressQuery, scoreTone, SOLVED_SCORE } from "@/features/problems";
import { activityQuery } from "@/features/progress/api";

interface StatProps {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}

function Stat({ label, value, detail, tone }: StatProps) {
  return (
    <li className="flex min-w-0 flex-col gap-0.5 bg-card px-4 py-3.5 sm:px-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tracking-[-0.03em] tabular-nums",
          tone,
        )}
      >
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
    <ul
      aria-label="Totals"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card lg:grid-cols-4"
    >
      <Stat
        label="Points"
        value={progress.points.toLocaleString("en")}
        detail={`Rank ${progress.rank.name}`}
      />
      <Stat
        label="Challenges solved"
        value={String(solved)}
        detail={`Scored ${SOLVED_SCORE} or more, of ${progress.problems.length} attempted`}
      />
      <Stat
        label="Interviews reviewed"
        value={String(interviewsReviewed)}
        detail={
          interviewsReviewed === 0 ? "None yet" : "Every one you finished"
        }
      />
      <Stat
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
    </ul>
  );
}
