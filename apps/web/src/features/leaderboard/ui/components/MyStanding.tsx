import type { LeaderboardModel } from "@repo/api-client";
import { Trophy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { ProfileForm } from "./ProfileForm";

interface MyStandingProps {
  me: LeaderboardModel["me"];
}

export function MyStanding({ me }: MyStandingProps) {
  const [editing, setEditing] = useState(false);
  const listed = me.handle !== null && me.visible;

  return (
    <section
      aria-labelledby="me-title"
      className="flex flex-col gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-indigo-200/60 bg-indigo-50 text-indigo-700">
            <Trophy aria-hidden="true" className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="me-title" className="font-semibold">
              {listed
                ? me.position === null
                  ? `You're listed as ${me.handle}`
                  : `You're #${me.position} as ${me.handle}`
                : me.handle === null
                  ? "You're not on the leaderboard"
                  : `${me.handle} is hidden from the leaderboard`}
            </h2>
            <p className="text-sm text-muted-foreground text-pretty">
              {me.points.toLocaleString("en")} points
              {me.solved > 0
                ? `, ${me.solved} ${me.solved === 1 ? "problem" : "problems"} solved`
                : ""}
              .{" "}
              {listed
                ? "Others see your handle and points."
                : "Choose a handle to appear; others will see it and your points only."}
            </p>
          </div>
        </div>
        {me.handle !== null && !editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>
      {me.handle === null || editing ? (
        <ProfileForm
          handle={me.handle}
          visible={me.visible}
          onDone={me.handle === null ? undefined : () => setEditing(false)}
        />
      ) : null}
    </section>
  );
}
