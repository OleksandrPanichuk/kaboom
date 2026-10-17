import type { ProblemRatingModel } from "@repo/api-client";

import { Button } from "@/components/ui/Button";

import { RatingStars } from "./RatingStars";
import { StarInput } from "./StarInput";

interface RatingSectionProps {
  rating: ProblemRatingModel;
  pending: boolean;
  error: string | null;
  onRate: (stars: number | null) => void;
}

const ELIGIBILITY_NOTE = {
  "own-problem": "You wrote this problem, so you cannot rate it.",
  "needs-submission": "Submit a solution to rate this problem.",
} as const;

export function RatingSection({
  rating,
  pending,
  error,
  onRate,
}: RatingSectionProps) {
  const highest = Math.max(1, ...rating.distribution);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {rating.average === null ? "–" : rating.average.toFixed(1)}
          </span>
          <RatingStars average={rating.average ?? 0} />
          <span className="text-xs text-muted-foreground">
            {rating.count === 0
              ? "No ratings yet"
              : `${rating.count} rating${rating.count === 1 ? "" : "s"}`}
          </span>
        </div>
        <ol className="flex min-w-0 flex-1 flex-col gap-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = rating.distribution[stars - 1] ?? 0;

            return (
              <li
                key={stars}
                className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums"
              >
                <span className="w-2 shrink-0 text-right">{stars}</span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-warning"
                    style={{ width: `${(count / highest) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right">{count}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {rating.eligibility === "eligible" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StarInput
            value={rating.mine}
            disabled={pending}
            onChange={(stars) => onRate(stars)}
          />
          {rating.mine !== null ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onRate(null)}
            >
              Clear my rating
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              How good is this problem?
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {ELIGIBILITY_NOTE[rating.eligibility]}
        </p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
