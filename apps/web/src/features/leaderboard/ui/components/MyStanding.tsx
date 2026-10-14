import type { LeaderboardModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Trophy } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";

interface MyStandingProps {
  me: LeaderboardModel["me"];
}

const note = (me: MyStandingProps["me"]) => {
  if (!me.visible) return "Your profile is hidden. Make it public to appear.";

  return me.position === null
    ? "Score on a challenge to get a place. Others see your display name, avatar and points."
    : "Others see your display name, avatar and points.";
};

export function MyStanding({ me }: MyStandingProps) {
  const facts = [
    { term: "Points", detail: me.points.toLocaleString("en") },
    { term: "Solved", detail: me.solved.toLocaleString("en") },
  ];

  return (
    <section
      aria-labelledby="me-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-interactive-border/60 bg-interactive-surface text-interactive-foreground">
          <Trophy aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 id="me-title" className="font-semibold">
            Your standing
          </h2>
          <p className="text-xs text-muted-foreground">
            {me.visible ? "On this board" : "Hidden from the board"}
          </p>
        </div>
        <p
          className={cn(
            "ml-auto text-3xl font-semibold tracking-[-0.03em] tabular-nums",
            me.position === null && "text-muted-foreground",
          )}
        >
          {me.position === null ? "–" : `#${me.position}`}
        </p>
      </div>
      <dl className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
        {facts.map((fact) => (
          <div
            key={fact.term}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="text-muted-foreground">{fact.term}</dt>
            <dd className="font-medium tabular-nums">{fact.detail}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground text-pretty">{note(me)}</p>
      <Link
        to="/settings/profile"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Edit profile
      </Link>
    </section>
  );
}
