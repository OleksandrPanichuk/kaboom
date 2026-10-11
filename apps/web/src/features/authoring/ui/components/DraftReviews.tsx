import type { ProblemDraftModel } from "@repo/api-client";

const STATUS = {
  pending: "Waiting for a moderator",
  approved: "Approved and published",
  rejected: "Sent back",
  withdrawn: "Withdrawn",
} as const;

const when = (at: string) =>
  new Date(at).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

interface DraftReviewsProps {
  reviews: ProblemDraftModel["reviews"];
}

export function DraftReviews({ reviews }: DraftReviewsProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Not sent for review yet.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-1 text-sm">
          <p className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{STATUS[review.status]}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {when(review.decidedAt ?? review.submittedAt)}
            </span>
          </p>
          {review.feedback ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2 whitespace-pre-line text-pretty">
              {review.feedback}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
