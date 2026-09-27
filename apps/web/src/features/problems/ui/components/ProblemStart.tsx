import type { ProblemModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, Play } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { Button, buttonVariants } from "@/components/ui/Button";

import { DifficultyBadge } from "./DifficultyBadge";

interface ProblemStartProps {
  problem: ProblemModel;
  pending: boolean;
  error: string | null;
  onStart: () => void;
}

export function ProblemStart({
  problem,
  pending,
  error,
  onStart,
}: ProblemStartProps) {
  const hidden = problem.drills.filter(
    (drill) => drill.visibility === "hidden",
  ).length;

  return (
    <main className="min-h-dvh bg-zinc-50/70 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link
          to="/problems"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 self-start text-muted-foreground",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Problems
        </Link>
        <div className="flex flex-col gap-3">
          <DifficultyBadge difficulty={problem.difficulty} />
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance">
            {problem.title}
          </h1>
          <p className="leading-6 text-muted-foreground text-pretty">
            {problem.summary}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-6">
          <Markdown>{problem.statement}</Markdown>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-5 text-muted-foreground text-pretty">
            {problem.drills.length} drills, {hidden} of them hidden until you
            submit. Starting gives you your own copy of the starting design.
          </p>
          <Button
            size="lg"
            className="shrink-0"
            disabled={pending}
            onClick={onStart}
          >
            <Play aria-hidden="true" />
            {pending ? "Starting…" : "Start problem"}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
