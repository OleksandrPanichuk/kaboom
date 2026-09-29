import type { ReviewModel } from "@repo/api-client";
import { cn } from "cn";
import { CircleCheck, CircleX, Sparkles, Target } from "lucide-react";

import { DrillResults, scoreTone } from "@/features/problems";

import { RubricItemCard } from "./RubricItemCard";

interface ReviewReportProps {
  review: ReviewModel;
}

const CARD =
  "rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-6";

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
        <p className="leading-7 text-zinc-800 text-pretty">{review.summary}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewList
          title="What went well"
          icon={<Sparkles aria-hidden="true" className="size-3.5" />}
          tone="text-emerald-700 bg-emerald-50 border-emerald-200/60"
          items={review.strengths}
          empty="Nothing stood out yet."
        />
        <ReviewList
          title="Practise next"
          icon={<Target aria-hidden="true" className="size-3.5" />}
          tone="text-indigo-700 bg-indigo-50 border-indigo-200/60"
          items={review.improvements}
          empty="Nothing to add."
        />
      </div>

      <section aria-labelledby="rubric" className="flex flex-col gap-3">
        <h2 id="rubric" className="text-lg font-semibold tracking-[-0.02em]">
          Rubric
        </h2>
        <ul className="flex flex-col gap-3">
          {review.items.map((item) => (
            <RubricItemCard key={item.key} item={item} />
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
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                />
              ) : (
                <CircleX
                  aria-label="Failed"
                  className="mt-0.5 size-4 shrink-0 text-red-600"
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
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-zinc-700 marker:text-zinc-300">
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
