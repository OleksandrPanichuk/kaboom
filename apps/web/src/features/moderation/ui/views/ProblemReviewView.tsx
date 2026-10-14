import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { buttonVariants } from "@/components/ui/Button";
import { DraftGraphCard } from "@/features/authoring";
import { reviewQuery } from "@/features/moderation/api";
import {
  ContentJson,
  ReviewDecision,
  ReviewFacts,
  ReviewPanel,
} from "@/features/moderation/ui/components";
import { changedFields } from "@/features/moderation/utils";
import { DifficultyBadge } from "@/features/problems";

interface ProblemReviewViewProps {
  reviewId: string;
  onDecided: () => void;
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const count = (value: unknown, one: string, many: string) => {
  const length = Array.isArray(value) ? value.length : 0;

  return `${length} ${length === 1 ? one : many}`;
};

export function ProblemReviewView({
  reviewId,
  onDecided,
}: ProblemReviewViewProps) {
  const { data: review } = useSuspenseQuery(reviewQuery(reviewId));
  const content = record(review.content);
  const reference = record(content.reference);
  const changed =
    review.currentContent !== null
      ? changedFields(review.content, review.currentContent)
      : null;

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Link
          to="/moderation"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 self-start text-muted-foreground",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Reviews
        </Link>
        <div className="flex max-w-3xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
              {review.title}
            </h1>
            <DifficultyBadge difficulty={review.difficulty} />
          </div>
          {content.summary ? (
            <p className="text-[15px] leading-6 text-muted-foreground text-pretty">
              {String(content.summary)}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {changed ? (
              <p className="rounded-xl border border-interactive-border bg-interactive-surface px-4 py-3 text-sm text-interactive-foreground text-pretty">
                An update to a published problem. Changed:{" "}
                <span className="font-medium">
                  {changed.length > 0 ? changed.join(", ") : "nothing visible"}
                </span>
                .
              </p>
            ) : null}
            {review.feedback ? (
              <p className="rounded-xl border border-warning-border bg-warning-surface px-4 py-3 text-sm whitespace-pre-line text-warning-foreground">
                {review.feedback}
              </p>
            ) : null}
            <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-8">
              <Markdown>{String(content.statement ?? "")}</Markdown>
            </article>
            <div className="flex flex-col gap-6">
              <ReviewPanel title="Baseline">
                <DraftGraphCard graph={content.baseline} />
              </ReviewPanel>
              <ReviewPanel title="Reference">
                <DraftGraphCard graph={reference.graph} />
              </ReviewPanel>
            </div>
            {reference.notes ? (
              <ReviewPanel title="Reference notes">
                <p className="text-sm leading-6 whitespace-pre-line text-pretty">
                  {String(reference.notes)}
                </p>
              </ReviewPanel>
            ) : null}
            <div className="flex flex-col gap-3">
              <ContentJson
                title="Drills"
                detail={count(content.drills, "drill", "drills")}
                value={content.drills}
              />
              <ContentJson
                title="Rubric"
                detail={count(content.rubric, "item", "items")}
                value={content.rubric}
              />
              <ContentJson
                title="Hints, interview and chaos"
                detail={count(content.hints, "hint", "hints")}
                value={{
                  hints: content.hints,
                  interview: content.interview,
                  chaos: content.chaos,
                }}
              />
            </div>
          </div>
          <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
            {review.status === "pending" ? (
              <ReviewPanel title="Decision">
                <ReviewDecision review={review} onDecided={onDecided} />
              </ReviewPanel>
            ) : null}
            <ReviewPanel title="About this review">
              <ReviewFacts review={review} />
            </ReviewPanel>
          </aside>
        </div>
      </div>
    </div>
  );
}
