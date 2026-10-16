import { cn } from "cn";
import { Star } from "lucide-react";

interface RatingStarsProps {
  average: number;
  className?: string;
}

export function RatingStars({ average, className }: RatingStarsProps) {
  return (
    <span
      role="img"
      aria-label={`${average} out of 5 stars`}
      className={cn("flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((stars) => {
        const filled = Math.min(1, Math.max(0, average - stars + 1));

        return (
          <span key={stars} className="relative size-3.5">
            <Star
              aria-hidden="true"
              className="absolute inset-0 size-3.5 text-muted-foreground/40"
            />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${filled * 100}%` }}
            >
              <Star
                aria-hidden="true"
                className="size-3.5 fill-warning text-warning"
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}
