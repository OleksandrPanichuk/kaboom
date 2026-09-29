import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { useCurrentUser } from "@/features/auth";
import { RankCard } from "@/features/problems";
import { NextUpCard, SkillsCard } from "@/features/skills";

interface HomeViewProps {
  onOpenInterview: (interviewId: string) => void;
}

export function HomeView({ onOpenInterview }: HomeViewProps) {
  const user = useCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 sm:p-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hi, {user.name}
        </h1>
        <p className="text-muted-foreground">
          Practise interviews, solve challenges and watch your skills grow.
        </p>
      </div>
      <NextUpCard onOpenInterview={onOpenInterview} />
      <SkillsCard />
      <RankCard />
      <Link
        to="/problems"
        className={cn(buttonVariants({ variant: "outline" }), "self-start")}
      >
        Browse problems
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
