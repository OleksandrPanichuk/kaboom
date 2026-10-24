import { TRACK_LABELS } from "@repo/design";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/Button";
import { DifficultyBadge } from "@/features/problems";
import { weeklyChallengeQuery } from "@/features/weekly-challenge/api";
import {
  WeeklyStandings,
  WeeklyStatus,
} from "@/features/weekly-challenge/ui/components";
import { timeLeft } from "@/features/weekly-challenge/utils";

export function WeeklyChallengeView() {
  const { data } = useSuspenseQuery(weeklyChallengeQuery);

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">
            This week's challenge
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
            One official problem for everyone, from Monday to Monday in UTC. The
            standings keep each person's best counted score this week.
          </p>
        </div>
        {data ? (
          <>
            <section
              aria-label="The problem"
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 text-xl font-semibold tracking-[-0.02em] text-balance">
                  {data.problem.title}
                </h2>
                <DifficultyBadge difficulty={data.problem.difficulty} />
                <span className="text-xs text-muted-foreground">
                  {TRACK_LABELS[data.problem.track]}
                </span>
              </div>
              <p className="leading-7 text-subtle-foreground text-pretty">
                {data.problem.summary}
              </p>
              <WeeklyStatus participants={data.participants} me={data.me} />
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/problems/$slug"
                  params={{ slug: data.problem.slug }}
                  className={buttonVariants()}
                >
                  {data.me.score === null ? "Take it on" : "Improve your score"}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {timeLeft(data.endsAt)}
                </p>
              </div>
            </section>
            <section aria-labelledby="top" className="flex flex-col gap-3">
              <h2 id="top" className="text-lg font-semibold tracking-[-0.02em]">
                Best scores this week
              </h2>
              <WeeklyStandings entries={data.entries} />
            </section>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-12 text-center text-sm text-muted-foreground">
            There is no challenge this week.
          </p>
        )}
      </div>
    </div>
  );
}
