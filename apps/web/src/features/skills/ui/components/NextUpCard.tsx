import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Compass } from "lucide-react";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { StartInterviewButton } from "@/features/interview";
import { TRACK_LABELS } from "@/features/problems";
import { skillsQuery } from "@/features/skills/api";

interface NextUpCardProps {
  onOpenInterview: (interviewId: string) => void;
}

export function NextUpCard({ onOpenInterview }: NextUpCardProps) {
  const { data } = useSuspenseQuery(skillsQuery);
  const [track, setTrack] = useState(data.next[0]?.track);
  const next = data.next.find((item) => item.track === track) ?? data.next[0];

  if (!next) return null;

  return (
    <section
      aria-labelledby="next-title"
      className="flex flex-col gap-4 rounded-2xl border border-indigo-200/70 bg-gradient-to-b from-indigo-50/80 to-white p-4 shadow-[0_12px_36px_-28px_rgba(49,46,129,0.5)] sm:p-5"
    >
      {data.next.length > 1 ? (
        <Tabs value={next.track} onValueChange={setTrack}>
          <TabsList aria-label="Track">
            {data.next.map((item) => (
              <TabsTrigger key={item.track} value={item.track}>
                {TRACK_LABELS[item.track]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-indigo-200/60 bg-white text-indigo-700">
          <Compass aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs font-medium tracking-wide text-indigo-700 uppercase">
            Next up
          </p>
          <h2
            id="next-title"
            className="text-lg font-semibold tracking-[-0.02em]"
          >
            {next.title}
          </h2>
          <p className="text-sm leading-6 text-zinc-700 text-pretty">
            {next.reason}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <StartInterviewButton
          slug={next.slug}
          label="Start the interview"
          variant="default"
          onOpen={onOpenInterview}
        />
        <Link
          to="/problems/$slug"
          params={{ slug: next.slug }}
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
        >
          Solve it as a challenge
        </Link>
      </div>
    </section>
  );
}
