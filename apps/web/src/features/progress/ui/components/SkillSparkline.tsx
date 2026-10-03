import { useState } from "react";

import type { TrendPoint } from "@/features/progress/utils";

interface SkillSparklineProps {
  label: string;
  points: TrendPoint[];
}

const WIDTH = 240;
const HEIGHT = 56;
const PAD = 6;
const MIN_SPAN = 20;

const formatDate = (at: string) =>
  new Date(at).toLocaleDateString("en", { month: "short", day: "numeric" });

export function SkillSparkline({ label, points }: SkillSparklineProps) {
  const [active, setActive] = useState<number | null>(null);
  const last = points.length - 1;
  const x = (index: number) =>
    last === 0 ? WIDTH / 2 : PAD + (index * (WIDTH - 2 * PAD)) / last;
  const values = points.map((point) => point.value);
  const middle = (Math.min(...values) + Math.max(...values)) / 2;
  const span = Math.max(
    MIN_SPAN,
    Math.max(...values) - Math.min(...values) + 10,
  );
  const low = Math.max(0, Math.min(100 - span, middle - span / 2));
  const y = (value: number) =>
    PAD + ((low + span - value) * (HEIGHT - 2 * PAD)) / span;
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`,
    )
    .join(" ");
  const shown = active ?? last;
  const focus = points[shown]!;

  const pick = (clientX: number, element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    const share = Math.min(1, Math.max(0, (clientX - box.left) / box.width));

    setActive(Math.round(share * last));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="group"
        tabIndex={0}
        aria-label={`${label} after each review. Use the arrow keys to read each point.`}
        className="relative h-14 cursor-crosshair rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onPointerMove={(event) => pick(event.clientX, event.currentTarget)}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setActive(Math.max(0, shown - 1));
          if (event.key === "ArrowRight") setActive(Math.min(last, shown + 1));
        }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="size-full overflow-visible"
        >
          <path
            d={path}
            fill="none"
            className="stroke-indigo-500"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {active !== null ? (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={0}
              y2={HEIGHT}
              className="stroke-zinc-300"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-indigo-600 ring-2 ring-white"
          style={{
            left: `${(x(shown) / WIDTH) * 100}%`,
            top: `${(y(focus.value) / HEIGHT) * 100}%`,
          }}
        />
      </div>
      <p aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">
          {focus.value}
        </span>{" "}
        after {focus.problem}, {formatDate(focus.at)}
        {focus.source === "challenge" ? " (challenge)" : ""} · earned{" "}
        <span className="tabular-nums">{focus.earned}</span>
      </p>
    </div>
  );
}
