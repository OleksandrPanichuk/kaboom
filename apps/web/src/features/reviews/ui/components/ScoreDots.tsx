import { cn } from "cn";

interface ScoreDotsProps {
  score: number | null;
  max?: number;
}

export function ScoreDots({ score, max = 3 }: ScoreDotsProps) {
  if (score === null) {
    return (
      <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
        Not scored
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`${score} of ${max}`}
      className="flex shrink-0 items-center gap-1"
    >
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-2.5 rounded-full",
            index < score
              ? score === max
                ? "bg-emerald-500"
                : score >= 2
                  ? "bg-indigo-500"
                  : "bg-amber-500"
              : "bg-zinc-200",
          )}
        />
      ))}
    </span>
  );
}
