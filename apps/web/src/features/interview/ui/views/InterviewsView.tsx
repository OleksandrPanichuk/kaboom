import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { MessagesSquare } from "lucide-react";

import { interviewsQuery } from "@/features/interview/api";
import { StartInterviewButton } from "@/features/interview/ui/components";
import { phaseLabel } from "@/features/interview/utils";

interface InterviewsViewProps {
  onOpen: (interviewId: string) => void;
}

const STATUS: Record<string, string> = {
  active: "In progress",
  reviewing: "Review pending",
  reviewed: "Reviewed",
  review_failed: "Review failed",
  expired: "Expired",
};

const REVIEWED = new Set(["reviewing", "reviewed", "review_failed"]);

export function InterviewsView({ onOpen }: InterviewsViewProps) {
  const { data } = useSuspenseQuery(interviewsQuery);

  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              Interviews
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
              Design a system while an interviewer asks questions and breaks it
              with drills.
            </p>
          </div>
          <StartInterviewButton
            slug="url-shortener"
            label="Start: URL shortener"
            variant="default"
            onOpen={onOpen}
          />
        </div>
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center">
            <MessagesSquare
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
            <p className="font-medium">No interviews yet</p>
            <p className="max-w-sm text-sm leading-5 text-muted-foreground text-pretty">
              An interview takes about forty minutes: requirements, a design, a
              deep dive with drills, and a wrap-up.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.items.map((interview) => (
              <li
                key={interview.id}
                className="relative flex min-w-0 flex-col gap-1 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] hover:border-indigo-200 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/50"
              >
                <Link
                  to={
                    REVIEWED.has(interview.status)
                      ? "/interviews/$interviewId/review"
                      : "/interviews/$interviewId"
                  }
                  params={{ interviewId: interview.id }}
                  className="font-semibold tracking-[-0.02em] outline-none after:absolute after:inset-0 after:rounded-2xl"
                >
                  {interview.problem.title}
                </Link>
                <p className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      interview.status === "active" &&
                        "font-medium text-indigo-700",
                    )}
                  >
                    {STATUS[interview.status] ?? interview.status}
                  </span>
                  {interview.status === "active" ? (
                    <span>· {phaseLabel(interview.phase)}</span>
                  ) : null}
                  <span>
                    ·{" "}
                    {new Date(interview.startedAt).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
