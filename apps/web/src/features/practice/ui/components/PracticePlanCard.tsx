import type { PracticePlanModel } from "@repo/api-client";
import { type Track, TRACK_LABELS, TRACKS } from "@repo/design";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  CalendarCheck2,
  Circle,
  CircleCheck,
  MessagesSquare,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { errorMessage } from "@/features/auth";
import {
  dropPracticePlanMutation,
  practicePlanQuery,
  startPracticePlanMutation,
} from "@/features/practice/api";

const ENDS = new Intl.DateTimeFormat("en", {
  weekday: "long",
  timeZone: "UTC",
});

const daysLeft = (endsAt: string) =>
  Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000),
  );

function PlanSteps({ plan }: { plan: PracticePlanModel }) {
  return (
    <ol className="flex flex-col gap-2">
      {plan.steps.map((step) => {
        const Mark = step.done ? CircleCheck : Circle;

        return (
          <li key={step.position}>
            <Link
              to="/problems/$slug"
              params={{ slug: step.slug }}
              className="group flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-interactive-border hover:bg-muted/40"
            >
              <Mark
                aria-label={step.done ? "Done" : "To do"}
                className={cn(
                  "size-4 shrink-0",
                  step.done ? "text-success" : "text-muted-foreground/60",
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm font-medium",
                  step.done && "text-muted-foreground line-through",
                )}
              >
                {step.title}
              </span>
              {step.interviewable ? (
                <MessagesSquare
                  aria-label="Can be an interview"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
              <span className="shrink-0 text-xs text-muted-foreground capitalize">
                {step.difficulty}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function PracticePlanCard() {
  const plan = useQuery(practicePlanQuery);
  const start = useMutation(startPracticePlanMutation);
  const drop = useMutation(dropPracticePlanMutation);
  const [track, setTrack] = useState<Track>("system-design");
  const [choosing, setChoosing] = useState(false);
  const error = start.error ?? drop.error;

  if (plan.isPending) return null;

  const current = choosing ? null : (plan.data ?? null);

  return (
    <section
      aria-labelledby="plan-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-muted/60 text-subtle-foreground">
          <CalendarCheck2 aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            This week
          </p>
          <h2
            id="plan-title"
            className="text-lg font-semibold tracking-[-0.02em]"
          >
            {current
              ? current.skillLabel
                ? `Practise ${current.skillLabel.toLowerCase()}`
                : `Get started in ${TRACK_LABELS[current.track].toLowerCase()}`
              : "Plan your week"}
          </h2>
          <p className="text-sm leading-6 text-subtle-foreground text-pretty">
            {current
              ? `${current.done} of ${current.total} done · ends ${ENDS.format(new Date(new Date(current.endsAt).getTime() - 1))}, ${daysLeft(current.endsAt)} day${daysLeft(current.endsAt) === 1 ? "" : "s"} left`
              : "Three problems for the week, aimed at your weakest skill. We remind you on Thursday if some are left."}
          </p>
        </div>
        {current ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Plan actions"
                  className="shrink-0"
                />
              }
            >
              <MoreHorizontal aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setTrack(current.track);
                  setChoosing(true);
                }}
              >
                <RefreshCw aria-hidden="true" />
                Make a new plan
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => drop.mutate()}
              >
                <Trash2 aria-hidden="true" />
                Drop this plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {current ? (
        <>
          <div
            role="progressbar"
            aria-label="Plan progress"
            aria-valuemin={0}
            aria-valuemax={current.total}
            aria-valuenow={current.done}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: `${(current.done / current.total) * 100}%` }}
            />
          </div>
          <PlanSteps plan={current} />
          {current.done === current.total ? (
            <p className="text-sm font-medium text-success-foreground">
              Plan complete. Nice work this week.
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <SegmentedControl
            name="plan-track"
            label="Track"
            value={track}
            options={TRACKS.map((value) => ({
              value,
              label: TRACK_LABELS[value],
            }))}
            onChange={(value) => setTrack(value as Track)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={start.isPending}
              onClick={() =>
                start.mutate(track, { onSuccess: () => setChoosing(false) })
              }
            >
              <CalendarCheck2 aria-hidden="true" data-icon="inline-start" />
              {start.isPending ? "Planning…" : "Make my plan"}
            </Button>
            {choosing ? (
              <Button variant="ghost" onClick={() => setChoosing(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(error)}
        </p>
      ) : null}
    </section>
  );
}
