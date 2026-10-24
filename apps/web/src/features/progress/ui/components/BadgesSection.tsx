import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
  Compass,
  Flame,
  type LucideIcon,
  Medal,
  MessagesSquare,
  PencilLine,
  Target,
  Trophy,
} from "lucide-react";

import { achievementsQuery } from "@/features/progress/api";
import { progressPercent } from "@/features/progress/utils";

const ICONS: Readonly<Record<string, LucideIcon>> = {
  "first-solve": Trophy,
  "solver-10": Medal,
  "sharp-shooter": Target,
  "every-track": Compass,
  "first-interview": MessagesSquare,
  "streak-7": Flame,
  "streak-30": Flame,
  author: PencilLine,
};

const earnedOn = (at: string) =>
  new Date(at).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function BadgesSection() {
  const { data } = useQuery(achievementsQuery);

  if (!data) return null;

  const earned = data.badges.filter((badge) => badge.earnedAt !== null).length;

  return (
    <section aria-labelledby="badges-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="badges-title"
          className="text-lg font-semibold tracking-[-0.02em]"
        >
          Badges
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {earned} of {data.badges.length}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.badges.map((badge) => {
          const Icon = ICONS[badge.key] ?? Trophy;
          const earnedAt = badge.earnedAt;

          return (
            <li
              key={badge.key}
              data-earned={earnedAt !== null}
              className={cn(
                "flex min-w-0 flex-col gap-3 rounded-2xl border p-4 shadow-card",
                earnedAt !== null
                  ? "border-interactive-border/60 bg-card"
                  : "border-border bg-muted/40",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border",
                    earnedAt !== null
                      ? "border-interactive-border/60 bg-interactive-surface text-interactive-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <p
                  className={cn(
                    "min-w-0 font-medium",
                    earnedAt === null && "text-muted-foreground",
                  )}
                >
                  {badge.title}
                </p>
              </div>
              <p className="text-sm leading-5 text-muted-foreground text-pretty">
                {badge.description}
              </p>
              {earnedAt !== null ? (
                <p className="text-xs font-medium text-interactive-foreground">
                  Earned {earnedOn(earnedAt)}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <div
                    role="progressbar"
                    aria-label={`${badge.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={badge.progress.target}
                    aria-valuenow={badge.progress.value}
                    className="h-1.5 overflow-hidden rounded-full bg-border"
                  >
                    <div
                      className="h-full rounded-full bg-interactive"
                      style={{
                        width: `${progressPercent(badge.progress.value, badge.progress.target)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {badge.progress.value} of {badge.progress.target}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
