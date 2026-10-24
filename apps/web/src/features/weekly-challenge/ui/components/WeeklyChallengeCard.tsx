import { TRACK_LABELS } from "@repo/design";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { DifficultyBadge } from "@/features/problems";
import { weeklyChallengeQuery } from "@/features/weekly-challenge/api";
import { timeLeft } from "@/features/weekly-challenge/utils";

import { WeeklyStatus } from "./WeeklyStatus";

export function WeeklyChallengeCard() {
  const { data } = useQuery(weeklyChallengeQuery);

  if (!data) return null;

  const { problem, me } = data;

  return (
    <section
      aria-label="This week's challenge"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays
            aria-hidden="true"
            className="size-4 text-interactive"
          />
          This week's challenge
        </h2>
        <p className="text-xs text-muted-foreground">{timeLeft(data.endsAt)}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 text-lg font-semibold tracking-[-0.02em] text-balance">
            {problem.title}
          </p>
          <DifficultyBadge difficulty={problem.difficulty} />
          <span className="text-xs text-muted-foreground">
            {TRACK_LABELS[problem.track]}
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground text-pretty">
          {problem.summary}
        </p>
      </div>
      <WeeklyStatus participants={data.participants} me={me} />
      <div className="flex flex-wrap gap-2">
        <Link
          to="/problems/$slug"
          params={{ slug: problem.slug }}
          className={buttonVariants({ size: "sm" })}
        >
          {me.score === null ? "Take it on" : "Improve your score"}
        </Link>
        <Link
          to="/weekly"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Standings
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
