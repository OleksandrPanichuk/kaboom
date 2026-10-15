import { cn } from "cn";

import { RANK_LADDER } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

const SKILLS = [
  { name: "Requirements", value: 82 },
  { name: "Core design", value: 74 },
  { name: "Scaling", value: 66 },
  { name: "Reliability", value: 48 },
  { name: "Communication", value: 79 },
];

const POINTS = 420;

export function GrowthSection() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Progress"
        title="See every skill move, and climb the board"
        body="Each review scores the skills it touched, recent work counting most. Points come from your best score on each problem, weighted by difficulty, and earn your rank."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div
          data-reveal
          className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card/70 p-6"
        >
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Your skills</span>
            <span className="text-xs text-muted-foreground">
              Next up: aims at Reliability
            </span>
          </div>
          <ul className="flex flex-col gap-3.5">
            {SKILLS.map((skill) => (
              <li
                key={skill.name}
                className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm"
              >
                <span className="text-muted-foreground">{skill.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    data-grow
                    className={cn(
                      "block h-full rounded-full",
                      skill.value < 50 ? "bg-warning-foreground" : "bg-primary",
                    )}
                    style={{ width: `${skill.value}%` }}
                  />
                </span>
                <span className="text-right font-mono tabular-nums">
                  {skill.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div
          data-reveal
          className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card/70 p-6"
        >
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Rank</span>
            <span className="font-mono text-sm text-muted-foreground">
              {POINTS} pts
            </span>
          </div>
          <ol className="flex flex-col gap-2">
            {[...RANK_LADDER].reverse().map((rank) => {
              const reached = POINTS >= rank.points;
              const current =
                reached &&
                RANK_LADDER.every(
                  (other) =>
                    other.points <= rank.points || POINTS < other.points,
                );

              return (
                <li
                  key={rank.name}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm",
                    current
                      ? "border-primary/40 bg-primary/10 font-semibold text-foreground"
                      : reached
                        ? "border-border/70 text-foreground"
                        : "border-dashed border-border/70 text-muted-foreground",
                  )}
                >
                  {rank.name}
                  <span className="font-mono text-xs">{rank.points}+</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
