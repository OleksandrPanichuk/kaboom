import { cn } from "cn";
import {
  Activity,
  Bot,
  Flame,
  type LucideIcon,
  PencilRuler,
  Radar,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

interface Tile {
  icon: LucideIcon;
  title: string;
  body: string;
  visual: ReactNode;
  className?: string;
}

const bar = (height: number, index: number, failing = false) => (
  <span
    key={index}
    className={cn(
      "w-full rounded-t-sm",
      failing ? "bg-danger-foreground/80" : "bg-primary/70",
    )}
    style={{ height: `${height}%` }}
  />
);

const TILES: Tile[] = [
  {
    icon: Bot,
    title: "An interviewer that pushes back",
    body: "A live interviewer reads your design as you draw it, asks why, runs drills mid-conversation and moves the interview on, like a real one.",
    className: "md:col-span-2",
    visual: (
      <div className="flex flex-col gap-2 text-xs">
        <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
          Your cache sits beside the read path. What happens to p99 when it is
          cold after a deploy?
        </p>
        <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-primary/90 px-3 py-2 text-primary-foreground">
          Reads fall through to Postgres. I would warm it from the replica
          first.
        </p>
        <p className="w-fit rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
          Let us check. Running the cold-start drill now…
        </p>
      </div>
    ),
  },
  {
    icon: Activity,
    title: "Load you can watch",
    body: "Every load test runs twenty varied times, so a design sized to the letter of the spec shows it.",
    visual: (
      <div className="flex h-24 items-end gap-1.5">
        {[42, 55, 48, 63, 70, 66, 78, 92, 84, 71, 60, 52].map((height, index) =>
          bar(height, index, index === 7),
        )}
      </div>
    ),
  },
  {
    icon: Flame,
    title: "Chaos from your own design",
    body: "Failures are drawn from what you built: a replica lost, a cache emptied, a dependency failing one request in twenty.",
    visual: (
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {[
          "Replica lost",
          "Cache emptied",
          "Zone down",
          "5% errors",
          "Failover",
          "Partition",
        ].map((label, index) => (
          <span
            key={label}
            className={cn(
              "rounded-lg border px-2 py-1.5 text-center",
              index === 2
                ? "border-danger-border bg-danger-surface text-danger-foreground motion-safe:animate-blink"
                : "border-success-border bg-success-surface text-success-foreground",
            )}
          >
            {label}
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: Radar,
    title: "Reviews with evidence",
    body: "Each rubric item is scored from 0 to 3 and cites the message, note or drill it rests on. Nothing is taken on vibes.",
    visual: (
      <div className="flex flex-col gap-2 text-xs">
        {[
          ["Requirements", 3],
          ["Core design", 2],
          ["Scaling", 2],
          ["Reliability", 1],
        ].map(([label, score]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
            <span className="flex flex-1 gap-1">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    dot < Number(score) ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: TrendingUp,
    title: "Skills that move",
    body: "Every review feeds your skills, recent work weighs most, and the next problem aims at your weakest one.",
    visual: (
      <svg viewBox="0 0 200 70" className="h-20 w-full" aria-hidden="true">
        <path
          d="M0 58 L25 52 L50 55 L75 40 L100 44 L125 30 L150 26 L175 18 L200 10"
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M0 58 L25 52 L50 55 L75 40 L100 44 L125 30 L150 26 L175 18 L200 10 L200 70 L0 70 Z"
          className="fill-primary/10"
        />
      </svg>
    ),
  },
  {
    icon: PencilRuler,
    title: "Write problems of your own",
    body: "Author a problem with drills and a rubric, have it reviewed, and watch others solve it on the leaderboard.",
    className: "md:col-span-3",
    visual: (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
        <span className="text-primary">drill</span>
        <span>"A link goes viral" · 40k req/s · p99 under 150 ms</span>
        <span className="text-primary">chaos</span>
        <span>availability 99.9% · recover in 30 s</span>
        <span className="text-primary">rubric</span>
        <span>serves-reads · within-budget · chaos-coverage</span>
      </div>
    ),
  },
];

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-10 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div data-reveal className="flex max-w-2xl flex-col gap-3">
        <p className="text-sm font-medium text-primary">What you get</p>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Everything a whiteboard cannot tell you
        </h2>
        <p className="text-base leading-7 text-muted-foreground text-pretty sm:text-lg">
          A diagram that only looks right is easy. Kaboom runs it, breaks it and
          explains what happened.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;

          return (
            <article
              key={tile.title}
              data-reveal
              className={cn(
                "group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-border/80 bg-card/50 p-6 transition-colors hover:border-primary/40",
                tile.className,
              )}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="relative">{tile.visual}</div>
              <div className="relative mt-auto flex flex-col gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Icon aria-hidden="true" className="size-4 text-primary" />
                  {tile.title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground text-pretty">
                  {tile.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
