import type { SharedInterviewModel } from "@repo/api-client";
import { cn } from "cn";
import { Sparkles, Target } from "lucide-react";

import { scoreTone } from "@/features/problems";
import { RubricItemRow } from "@/features/reviews";

interface SharedReviewProps {
  interview: SharedInterviewModel;
}

const CARD = "rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6";

export function SharedReview({ interview }: SharedReviewProps) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Score" className={cn(CARD, "flex flex-col gap-4")}>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-5xl font-semibold tracking-[-0.05em] tabular-nums",
                interview.score === null
                  ? "text-muted-foreground"
                  : scoreTone(interview.score),
              )}
            >
              {interview.score ?? "–"}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </p>
          <p className="pb-1.5 text-sm text-muted-foreground tabular-nums">
            Design checks {interview.designScore} / 100
          </p>
        </div>
        <p className="leading-7 text-subtle-foreground text-pretty">
          {interview.summary}
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: "What went well",
            icon: <Sparkles aria-hidden="true" className="size-3.5" />,
            tone: "text-success-foreground bg-success-surface border-success-border/60",
            items: interview.strengths,
          },
          {
            title: "Practise next",
            icon: <Target aria-hidden="true" className="size-3.5" />,
            tone: "text-interactive-foreground bg-interactive-surface border-interactive-border/60",
            items: interview.improvements,
          },
        ].map(({ title, icon, tone, items }) => (
          <section key={title} className={cn(CARD, "flex flex-col gap-3")}>
            <h2
              className={cn(
                "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                tone,
              )}
            >
              {icon}
              {title}
            </h2>
            {items.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm leading-6 text-subtle-foreground">
                {items.map((item) => (
                  <li key={item} className="text-pretty">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to add.</p>
            )}
          </section>
        ))}
      </div>
      {interview.items.length > 0 ? (
        <section aria-labelledby="rubric" className="flex flex-col gap-3">
          <h2 id="rubric" className="text-lg font-semibold tracking-[-0.02em]">
            Rubric
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {interview.items.map((item) => (
              <RubricItemRow
                key={item.title}
                item={{ ...item, key: item.title, citations: [] }}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
