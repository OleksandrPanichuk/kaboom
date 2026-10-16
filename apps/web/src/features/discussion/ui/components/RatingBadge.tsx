import { cn } from "cn";
import { MessageSquare, Star } from "lucide-react";

interface RatingBadgeProps {
  rating: { average: number | null; count: number };
  commentCount?: number;
  className?: string;
}

export function RatingBadge({
  rating,
  commentCount,
  className,
}: RatingBadgeProps) {
  if (rating.average === null && !commentCount) return null;

  return (
    <span
      className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground tabular-nums",
        className,
      )}
    >
      {rating.average !== null ? (
        <span
          className="flex items-center gap-1"
          title={`${rating.count} rating${rating.count === 1 ? "" : "s"}`}
        >
          <Star
            aria-hidden="true"
            className="size-3.5 fill-warning text-warning"
          />
          <span className="font-medium text-foreground">
            {rating.average.toFixed(1)}
          </span>
          <span>({rating.count})</span>
          <span className="sr-only">ratings</span>
        </span>
      ) : null}
      {commentCount ? (
        <span className="flex items-center gap-1">
          <MessageSquare aria-hidden="true" className="size-3.5" />
          {commentCount}
          <span className="sr-only">
            comment{commentCount === 1 ? "" : "s"}
          </span>
        </span>
      ) : null}
    </span>
  );
}
