import type { InterviewModel } from "@repo/api-client";
import { TRACK_LABELS } from "@repo/design";
import { MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface ReviewFactsProps {
  interview: InterviewModel;
  onOpenInterview: () => void;
}

const STATUS: Record<InterviewModel["status"], string> = {
  active: "In progress",
  reviewing: "Being reviewed",
  reviewed: "Reviewed",
  review_failed: "Review failed",
  expired: "Expired",
};

const MINUTE = 60_000;

const day = (at: string) =>
  new Date(at).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function ReviewFacts({ interview, onOpenInterview }: ReviewFactsProps) {
  const minutes =
    interview.endedAt === null
      ? null
      : Math.max(
          1,
          Math.round(
            (Date.parse(interview.endedAt) - Date.parse(interview.startedAt)) /
              MINUTE,
          ),
        );
  const said = interview.messages.filter(
    (message) => message.author === "user",
  ).length;
  const facts = [
    { term: "Status", detail: STATUS[interview.status] },
    { term: "Track", detail: TRACK_LABELS[interview.problem.track] },
    {
      term: "Level",
      detail:
        interview.problem.difficulty.charAt(0).toUpperCase() +
        interview.problem.difficulty.slice(1),
    },
    { term: "Started", detail: day(interview.startedAt) },
    ...(minutes === null ? [] : [{ term: "Length", detail: `${minutes} min` }]),
    { term: "Your messages", detail: String(said) },
  ];

  return (
    <aside className="order-first flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5 lg:sticky lg:top-6 lg:order-none">
      <Button variant="outline" onClick={onOpenInterview}>
        <MessagesSquare aria-hidden="true" />
        Open the interview
      </Button>
      <dl className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
        {facts.map((fact) => (
          <div
            key={fact.term}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="shrink-0 text-muted-foreground">{fact.term}</dt>
            <dd className="text-right">{fact.detail}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
