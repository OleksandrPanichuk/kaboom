import type { ReviewModel } from "@repo/api-client";
import { cn } from "cn";
import { CircleCheck, CircleX, Sparkles, Target } from "lucide-react";

import { DrillResults, scoreTone } from "@/features/problems";

import { RubricItemRow } from "./RubricItemRow";

interface ReviewReportProps {
  review: ReviewModel;
}

const CARD = "rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6";

export function ReviewReport({ review }: ReviewReportProps) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Score" className={cn(CARD, "flex flex-col gap-4")}>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-5xl font-semibold tracking-[-0.05em] tabular-nums",
                review.score === null
                  ? "text-muted-foreground"
                  : scoreTone(review.score),
              )}
            >
              {review.score ?? "–"}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </p>
          <p className="pb-1.5 text-sm text-muted-foreground tabular-nums">
            Design checks {review.designScore} / 100
          </p>
        </div>
        <p className="leading-7 text-subtle-foreground text-pretty">
          {review.summary}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewList
          title="What went well"
          icon={<Sparkles aria-hidden="true" className="size-3.5" />}
          tone="text-success-foreground bg-success-surface border-success-border/60"
          items={review.strengths}
          empty="Nothing stood out yet."
        />
        <ReviewList
          title="Practise next"
          icon={<Target aria-hidden="true" className="size-3.5" />}
          tone="text-interactive-foreground bg-interactive-surface border-interactive-border/60"
          items={review.improvements}
          empty="Nothing to add."
        />
      </div>

      <section aria-labelledby="rubric" className="flex flex-col gap-3">
        <h2 id="rubric" className="text-lg font-semibold tracking-[-0.02em]">
          Rubric
        </h2>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {review.items.map((item) => (
            <RubricItemRow key={item.key} item={item} />
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="checks"
        className={cn(CARD, "flex flex-col gap-4")}
      >
        <div className="flex flex-col gap-1">
          <h2 id="checks" className="text-lg font-semibold tracking-[-0.02em]">
            Your final design
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Every check and drill ran against the design as the interview ended,
            at revision {review.revision}.
          </p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {review.checks.map((check) => (
            <li key={check.key} className="flex min-w-0 gap-2.5">
              {check.passed ? (
                <CircleCheck
                  aria-label="Passed"
                  className="mt-0.5 size-4 shrink-0 text-success"
                />
              ) : (
                <CircleX
                  aria-label="Failed"
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-medium">{check.title}</p>
                <p className="text-sm leading-5 text-muted-foreground text-pretty">
                  {check.evidence}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <DrillResults drills={review.drills} />
      </section>
    </div>
  );
}

interface ReviewListProps {
  title: string;
  icon: React.ReactNode;
  tone: string;
  items: string[];
  empty: string;
}

function ReviewList({ title, icon, tone, items, empty }: ReviewListProps) {
  return (
    <section className={cn(CARD, "flex flex-col gap-3")}>
      <h2 className="flex items-center gap-2 font-semibold">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg border",
            tone,
          )}
        >
          {icon}
        </span>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-subtle-foreground marker:text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="text-pretty">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
