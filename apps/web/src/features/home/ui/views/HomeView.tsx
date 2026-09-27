import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { useCurrentUser } from "@/features/auth";
import { RankCard } from "@/features/problems";

export function HomeView() {
  const user = useCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 sm:p-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hi, {user.name}
        </h1>
        <p className="text-muted-foreground">
          Solve problems to earn points and climb the ranks.
        </p>
      </div>
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
