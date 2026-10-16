import type { ProblemReviewSummaryModel } from "@repo/api-client";
import { TRACK_LABELS } from "@repo/design";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { FilePen, FilePlus, Inbox } from "lucide-react";

import { RatingBadge } from "@/features/discussion";
import { DifficultyBadge } from "@/features/problems";

interface ReviewsTableProps {
  reviews: ProblemReviewSummaryModel[];
}

const when = (at: string) =>
  new Date(at).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ReviewsTable({ reviews }: ReviewsTableProps) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-12 text-center">
        <Inbox aria-hidden="true" className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="relative grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40 sm:px-5 lg:grid-cols-[2.25rem_minmax(0,1fr)_8rem_5.5rem_10rem] lg:items-center"
        >
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl border",
              review.update
                ? "border-border bg-muted/60 text-subtle-foreground"
                : "border-interactive-border/60 bg-interactive-surface text-interactive-foreground",
            )}
          >
            {review.update ? (
              <FilePen aria-hidden="true" className="size-4" />
            ) : (
              <FilePlus aria-hidden="true" className="size-4" />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                to="/moderation/$reviewId"
                params={{ reviewId: review.id }}
                className="font-semibold tracking-[-0.015em] break-words outline-none after:absolute after:inset-0"
              >
                {review.title}
              </Link>
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                  review.update
                    ? "bg-muted text-subtle-foreground"
                    : "bg-interactive-surface text-interactive-foreground",
                )}
              >
                {review.update ? "Update" : "New"}
              </span>
            </span>
            <p className="truncate text-xs text-muted-foreground">
              {review.author ? `@${review.author.handle}` : "Unknown author"} ·{" "}
              <span className="font-mono">/problems/{review.slug}</span>
            </p>
            {review.liveRating ? (
              <RatingBadge rating={review.liveRating} />
            ) : null}
          </div>
          <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm lg:contents">
            <span className="text-muted-foreground">
              {TRACK_LABELS[review.track]}
            </span>
            <span>
              <DifficultyBadge difficulty={review.difficulty} />
            </span>
            <time
              dateTime={review.submittedAt}
              className="whitespace-nowrap text-muted-foreground lg:text-right"
            >
              Sent {when(review.submittedAt)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
