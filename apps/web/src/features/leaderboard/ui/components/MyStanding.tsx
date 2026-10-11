import type { LeaderboardModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Trophy } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";

interface MyStandingProps {
  me: LeaderboardModel["me"];
}

const headline = (me: MyStandingProps["me"]) => {
  if (!me.visible) return "Your profile is hidden from the leaderboard";

  return me.position === null
    ? "Score on a challenge to get a place"
    : `You're #${me.position}`;
};

export function MyStanding({ me }: MyStandingProps) {
  return (
    <section
      aria-labelledby="me-title"
      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-indigo-200/60 bg-indigo-50 text-indigo-700">
          <Trophy aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="me-title" className="font-semibold">
            {headline(me)}
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            {me.points.toLocaleString("en")} points
            {me.solved > 0
              ? `, ${me.solved} ${me.solved === 1 ? "problem" : "problems"} solved`
              : ""}
            .{" "}
            {me.visible
              ? "Others see your display name, avatar and points."
              : "Make your profile public to appear."}
          </p>
        </div>
      </div>
      <Link
        to="/settings/profile"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Edit profile
      </Link>
    </section>
  );
}
