import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Markdown } from "@/components/Markdown";
import { buttonVariants } from "@/components/ui/Button";
import { DraftGraphCard } from "@/features/authoring";
import { reviewQuery } from "@/features/moderation/api";
import { ReviewDecision } from "@/features/moderation/ui/components";
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-xl bg-muted/60 p-3 text-xs leading-5">
      {value === undefined ? "None" : JSON.stringify(value, null, 2)}
    </pre>
  );
}

const STATUS = {
  pending: "Waiting for a decision",
  approved: "Approved",
  rejected: "Sent back",
  withdrawn: "Withdrawn by the author",
} as const;

export function ProblemReviewView({
  reviewId,
  onDecided,
}: ProblemReviewViewProps) {
  const { data: review } = useSuspenseQuery(reviewQuery(reviewId));
  const content = record(review.content);
  const changed =
    review.currentContent !== null
      ? changedFields(review.content, review.currentContent)
      : null;

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3">
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {review.title}
            </h1>
            <DifficultyBadge difficulty={review.difficulty} />
          </div>
          <p className="text-sm text-muted-foreground">
            {review.author ? (
              <Link
                to="/u/$handle"
                params={{ handle: review.author.handle }}
                className="font-medium text-interactive-foreground hover:underline"
              >
                {review.author.displayName}
              </Link>
            ) : (
              "Unknown author"
            )}{" "}
            · /problems/{review.slug} · {STATUS[review.status]}
          </p>
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
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <Panel title="Statement">
              <p className="text-sm text-muted-foreground text-pretty">
                {String(content.summary ?? "")}
              </p>
              <div className="text-sm">
                <Markdown>{String(content.statement ?? "")}</Markdown>
              </div>
            </Panel>
            <Panel title="Baseline">
              <DraftGraphCard graph={content.baseline} />
            </Panel>
            <Panel title="Reference">
              <DraftGraphCard graph={record(content.reference).graph} />
              {record(content.reference).notes ? (
                <p className="text-sm whitespace-pre-line text-pretty">
                  {String(record(content.reference).notes)}
                </p>
              ) : null}
            </Panel>
            <Panel title="Drills">
              <Json value={content.drills} />
            </Panel>
            <Panel title="Rubric">
              <Json value={content.rubric} />
            </Panel>
            <Panel title="Hints, interview and chaos">
              <Json
                value={{
                  hints: content.hints,
                  interview: content.interview,
                  chaos: content.chaos,
                }}
              />
            </Panel>
          </div>
          <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            {review.status === "pending" ? (
              <Panel title="Decision">
                <ReviewDecision review={review} onDecided={onDecided} />
              </Panel>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
