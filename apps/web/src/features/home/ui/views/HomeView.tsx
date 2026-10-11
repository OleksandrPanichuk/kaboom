import { Link } from "@tanstack/react-router";
import { ArrowRight, PencilLine, Puzzle } from "lucide-react";

import { useCurrentUser } from "@/features/auth";
import { RankCard } from "@/features/problems";
import { ActivityList } from "@/features/progress";
import { NextUpCard, SkillsCard } from "@/features/skills";

interface HomeViewProps {
  onOpenInterview: (interviewId: string) => void;
}

const LINKS = [
  {
    to: "/problems",
    icon: Puzzle,
    title: "Browse problems",
    detail: "Every challenge, by track and level",
  },
  {
    to: "/authoring",
    icon: PencilLine,
    title: "Write a problem",
    detail: "Draft one of your own for others to solve",
  },
] as const;

export function HomeView({ onOpenInterview }: HomeViewProps) {
  const user = useCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:p-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">
          Hi, {user.name}
        </h1>
        <p className="text-muted-foreground">
          Practise interviews, solve challenges and watch your skills grow.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <NextUpCard onOpenInterview={onOpenInterview} />
          <ActivityList />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <RankCard />
          <SkillsCard />
          <nav aria-label="Shortcuts" className="flex flex-col gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card transition-colors hover:border-interactive-border"
              >
                <link.icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-interactive"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{link.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {link.detail}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
