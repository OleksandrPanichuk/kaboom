import type { ProblemModel } from "@repo/api-client";
import { TRACK_LABELS } from "@repo/design";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, Play } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ForkProblemButton } from "@/features/authoring";
import { StartInterviewButton } from "@/features/interview";

import { DifficultyBadge } from "./DifficultyBadge";
import { ProblemCredit } from "./ProblemCredit";

interface ProblemStartProps {
  problem: ProblemModel;
  pending: boolean;
  error: string | null;
  onStart: () => void;
  onOpenInterview: (interviewId: string) => void;
  onOpenDraft: (draftId: string) => void;
}

export function ProblemStart({
  problem,
  pending,
  error,
  onStart,
  onOpenInterview,
  onOpenDraft,
}: ProblemStartProps) {
  const hidden = problem.drills.filter(
    (drill) => drill.visibility === "hidden",
  ).length;

  const facts = [
    { term: "Track", detail: TRACK_LABELS[problem.track] },
    {
      term: "Drills",
      detail:
        hidden > 0
          ? `${problem.drills.length}, ${hidden} hidden until you submit`
          : String(problem.drills.length),
    },
    {
      term: "Hints",
      detail:
        problem.hints.length > 0
          ? `${problem.hints.length}, each costs points`
          : "None",
    },
  ];

  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
            {problem.title}
          </h1>
          <p className="text-[15px] leading-6 text-muted-foreground text-pretty">
            {problem.summary}
          </p>
          <ProblemCredit problem={problem} />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-8">
            <Markdown>{problem.statement}</Markdown>
          </article>
          <aside className="order-first flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5 lg:sticky lg:top-6 lg:order-none">
            <div className="flex flex-col gap-2">
              <Button size="lg" disabled={pending} onClick={onStart}>
                <Play aria-hidden="true" />
                {pending ? "Starting…" : "Start problem"}
              </Button>
              {problem.interviewable ? (
                <StartInterviewButton
                  slug={problem.slug}
                  onOpen={onOpenInterview}
                />
              ) : null}
              <ForkProblemButton slug={problem.slug} onForked={onOpenDraft} />
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground text-pretty">
                Starting gives you your own copy of the starting design.
              </p>
            </div>
            <dl className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Difficulty</dt>
                <dd>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </dd>
              </div>
              {facts.map((fact) => (
                <div
                  key={fact.term}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="shrink-0 text-muted-foreground">
                    {fact.term}
                  </dt>
                  <dd className="text-right">{fact.detail}</dd>
                </div>
              ))}
            </dl>
            {problem.tags.length > 0 ? (
              <ul
                aria-label="Tags"
                className="flex flex-wrap gap-1 border-t border-border pt-4"
              >
                {problem.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-subtle-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
