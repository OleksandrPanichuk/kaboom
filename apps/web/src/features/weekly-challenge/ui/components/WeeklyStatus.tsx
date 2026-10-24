import type { WeeklyChallengeModel } from "@repo/api-client";

interface WeeklyStatusProps {
  participants: number;
  me: WeeklyChallengeModel["me"];
}

export function WeeklyStatus({ participants, me }: WeeklyStatusProps) {
  if (me.score !== null) {
    return (
      <p className="text-sm text-subtle-foreground tabular-nums">
        Your best this week is{" "}
        <span className="font-semibold text-foreground">{me.score}</span>
        {me.position !== null ? ` · place ${me.position}` : ""}
        {` · ${me.attempts} ${me.attempts === 1 ? "try" : "tries"}`}
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {participants === 0
        ? "Nobody has tried it yet. Be the first."
        : `${participants} ${participants === 1 ? "person has" : "people have"} tried it so far.`}
    </p>
  );
}
