import type { ProblemReviewModel } from "@repo/api-client";
import { TRACK_LABELS } from "@repo/design";
import { Link } from "@tanstack/react-router";

import { DifficultyBadge } from "@/features/problems";

interface ReviewFactsProps {
  review: ProblemReviewModel;
}

const STATUS = {
  pending: "Waiting for a decision",
  approved: "Approved",
  rejected: "Sent back",
  withdrawn: "Withdrawn by the author",
} as const;

const when = (at: string) =>
  new Date(at).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function ReviewFacts({ review }: ReviewFactsProps) {
  const facts = [
    { term: "Status", detail: STATUS[review.status] },
    { term: "Kind", detail: review.update ? "Update" : "New problem" },
    { term: "Track", detail: TRACK_LABELS[review.track] },
    { term: "Sent", detail: when(review.submittedAt) },
    ...(review.decidedAt
      ? [{ term: "Decided", detail: when(review.decidedAt) }]
      : []),
  ];

  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="shrink-0 text-muted-foreground">Author</dt>
        <dd className="min-w-0 truncate text-right">
          {review.author ? (
            <Link
              to="/u/$handle"
              params={{ handle: review.author.handle }}
              className="font-medium text-interactive-foreground hover:underline"
            >
              {review.author.displayName}
            </Link>
          ) : (
            "Unknown"
          )}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted-foreground">Asked as</dt>
        <dd>
          <DifficultyBadge difficulty={review.difficulty} />
        </dd>
      </div>
      {facts.map((fact) => (
        <div
          key={fact.term}
          className="flex items-baseline justify-between gap-3"
        >
          <dt className="shrink-0 text-muted-foreground">{fact.term}</dt>
          <dd className="text-right">{fact.detail}</dd>
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground">Address</dt>
        <dd className="font-mono text-xs break-all">/problems/{review.slug}</dd>
      </div>
    </dl>
  );
}
