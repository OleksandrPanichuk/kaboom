import type { ProblemReviewSummaryModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";

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
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Nothing here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border border-border bg-card">
      {reviews.map((review) => (
        <li key={review.id}>
          <Link
            to="/moderation/$reviewId"
            params={{ reviewId: review.id }}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{review.title}</span>
                {review.update ? (
                  <span className="shrink-0 rounded-full bg-interactive-surface px-2 py-0.5 text-xs font-medium text-interactive-foreground">
                    Update
                  </span>
                ) : null}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {review.author ? `@${review.author.handle}` : "Unknown author"}{" "}
                · {review.slug} · sent {when(review.submittedAt)}
              </span>
            </span>
            <DifficultyBadge difficulty={review.difficulty} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
