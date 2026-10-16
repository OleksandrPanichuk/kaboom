import { cn } from "cn";
import { Star } from "lucide-react";
import { useState } from "react";

const STARS = [1, 2, 3, 4, 5] as const;

interface StarInputProps {
  value: number | null;
  disabled?: boolean;
  onChange: (stars: number) => void;
}

export function StarInput({ value, disabled, onChange }: StarInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value ?? 0;

  return (
    <div
      role="radiogroup"
      aria-label="Your rating"
      className="flex items-center gap-0.5"
      onPointerLeave={() => setHovered(null)}
    >
      {STARS.map((stars) => (
        <button
          key={stars}
          type="button"
          role="radio"
          aria-checked={value === stars}
          aria-label={`${stars} star${stars === 1 ? "" : "s"}`}
          disabled={disabled}
          onPointerEnter={() => setHovered(stars)}
          onFocus={() => setHovered(stars)}
          onBlur={() => setHovered(null)}
          onClick={() => onChange(stars)}
          className="rounded-md p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Star
            aria-hidden="true"
            className={cn(
              "size-6 transition-colors",
              stars <= shown
                ? "fill-warning text-warning"
                : "text-muted-foreground/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}
