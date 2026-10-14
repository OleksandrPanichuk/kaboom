import type { InterviewSummaryModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CirclePlay,
  CircleSlash,
  LoaderCircle,
} from "lucide-react";

import { phaseLabel } from "@/features/interview/utils";

interface InterviewRowProps {
  interview: InterviewSummaryModel;
}

type Status = InterviewSummaryModel["status"];

const STATUS: Record<
  Status,
  { label: string; icon: typeof CircleCheck; tone: string; action: string }
> = {
  active: {
    label: "In progress",
    icon: CirclePlay,
    tone: "text-interactive",
    action: "Resume",
  },
  reviewing: {
    label: "Review pending",
    icon: LoaderCircle,
    tone: "text-muted-foreground",
    action: "Open",
  },
  reviewed: {
    label: "Reviewed",
    icon: CircleCheck,
    tone: "text-success",
    action: "Read the review",
  },
  review_failed: {
    label: "Review failed",
    icon: CircleAlert,
    tone: "text-destructive",
    action: "Open",
  },
  expired: {
    label: "Expired",
    icon: CircleSlash,
    tone: "text-muted-foreground",
    action: "Open",
  },
};

const REVIEWED = new Set<Status>(["reviewing", "reviewed", "review_failed"]);

const when = (at: string) =>
  new Date(at).toLocaleDateString("en", { month: "short", day: "numeric" });

export function InterviewRow({ interview }: InterviewRowProps) {
  const status = STATUS[interview.status];
  const active = interview.status === "active";

  return (
    <li className="relative grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-4 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40 sm:px-5 lg:grid-cols-[1rem_minmax(0,1fr)_5.5rem_5rem_8.5rem] lg:items-center">
      <span className="pt-0.5 lg:pt-0">
        <status.icon
          aria-hidden="true"
          className={cn(
            "size-4",
            status.tone,
            interview.status === "reviewing" && "animate-spin",
          )}
        />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to={
            REVIEWED.has(interview.status)
              ? "/interviews/$interviewId/review"
              : "/interviews/$interviewId"
          }
          params={{ interviewId: interview.id }}
          className="font-semibold tracking-[-0.015em] outline-none after:absolute after:inset-0"
        >
          {interview.problem.title}
        </Link>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <span
            className={cn(active && "font-medium text-interactive-foreground")}
          >
            {status.label}
          </span>
          {active ? <span>· {phaseLabel(interview.phase)}</span> : null}
          <span className="lg:hidden">· {when(interview.startedAt)}</span>
        </p>
      </div>
      <span className="hidden text-sm text-muted-foreground capitalize lg:block">
        {interview.problem.difficulty}
      </span>
      <time
        dateTime={interview.startedAt}
        className="hidden text-sm text-muted-foreground lg:block"
      >
        {when(interview.startedAt)}
      </time>
      <span
        aria-hidden="true"
        className={cn(
          "hidden items-center justify-end gap-1 text-sm font-medium lg:flex",
          active ? "text-interactive-foreground" : "text-muted-foreground",
        )}
      >
        {status.action}
        <ArrowRight className="size-3.5" />
      </span>
    </li>
  );
}
